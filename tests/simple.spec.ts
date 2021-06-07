import * as anchor from '@project-serum/anchor'
import { Program, BN, Provider } from '@project-serum/anchor'
import { TokenInstructions } from '@project-serum/serum'
import {
  PublicKey,
  Keypair,
  Connection,
  Transaction,
  sendAndConfirmRawTransaction
} from '@solana/web3.js'
import { Token, u64, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { assert } from 'chai'

const SEED = Buffer.from('Synthetify')
export const mainProgram = anchor.workspace.Simple as Program
let nonce: number

const provider = anchor.Provider.local()
const connection = provider.connection
const wallet = (provider.wallet as unknown as { payer: Keypair }).payer

let programAuthority: PublicKey
export let someToken: Token

before(async () => {
  anchor.setProvider(anchor.Provider.env())

  const [_programAuthority, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [SEED],
    mainProgram.programId
  )
  programAuthority = _programAuthority
  nonce = _nonce

  someToken = await createToken(connection, wallet, programAuthority)
})

let owner = Keypair.generate()
let staking: PublicKey
let tokens: PublicKey

describe('Simple', () => {
  it('Mint', async () => {
    //creating accounts
    staking = await someToken.createAccount(programAuthority)
    tokens = await someToken.createAccount(owner.publicKey)
    //minting tokens
    await mainProgram.rpc.mintTokens(nonce, {
      accounts: {
        mint: someToken.publicKey,
        auth: programAuthority,
        owner: owner.publicKey,
        tokens,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY
      },
      signers: [owner]
    })

    //checking balance
    assert.ok((await someToken.getAccountInfo(tokens)).amount.eq(to64(50)))
  })

  it('Deposit', async () => {
    const amountToSend = to64(42)
    //creating instructions
    const depositIx = await depositInstruction(amountToSend, staking, tokens, owner.publicKey)

    const approveIx = Token.createApproveInstruction(
      someToken.programId,
      tokens,
      programAuthority,
      owner.publicKey,
      [],
      amountToSend
    )

    //sending Transaction
    await signAndSend(new Transaction().add(approveIx).add(depositIx), [wallet, owner], connection)

    //checking balances
    assert.ok((await someToken.getAccountInfo(tokens)).amount.eq(to64(8)))
    assert.ok((await someToken.getAccountInfo(staking)).amount.eq(to64(42)))
  })
})

function to64(amount) {
  return new u64(amount.toString())
}

async function signAndSend(tx, signers, connection) {
  tx.setSigners(...signers.map((s) => s.publicKey))
  const blockhash = await connection.getRecentBlockhash(Provider.defaultOptions().commitment)

  tx.recentBlockhash = blockhash.blockhash
  tx.partialSign(...signers)
  const rawTx = tx.serialize()
  return await sendAndConfirmRawTransaction(connection, rawTx, Provider.defaultOptions())
}

async function depositInstruction(
  amount: BN,
  collateralAccount: PublicKey,
  userCollateralAccount: PublicKey,
  owner: PublicKey
) {
  return await mainProgram.instruction.deposit(amount, nonce, {
    accounts: {
      owner: owner,
      collateralAccount: collateralAccount,
      userCollateralAccount: userCollateralAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      exchangeAuthority: programAuthority
    }
  })
}

async function createToken(connection: Connection, payer: Keypair, mintAuthority: PublicKey) {
  const token = await Token.createMint(
    connection,
    payer,
    mintAuthority,
    null,
    4,
    TokenInstructions.TOKEN_PROGRAM_ID
  )
  return token
}
