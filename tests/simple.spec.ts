import * as anchor from '@project-serum/anchor'
import { Program, BN } from '@project-serum/anchor'
import { TokenInstructions } from '@project-serum/serum'
import { PublicKey, Keypair, Connection, Transaction } from '@solana/web3.js'
import { Token, u64 } from '@solana/spl-token'
import { assert } from 'console'


const SEED = Buffer.from('Synthetify')
const TOKEN_PROGRAM = TokenInstructions.TOKEN_PROGRAM_ID
export const mainProgram = anchor.workspace.Simple as Program
let nonce: number

const provider = anchor.Provider.local()
const connection = provider.connection
const wallet = (provider.wallet as unknown as { payer: Keypair }).payer

let programAuthority: PublicKey
export let someToken: Token


before(async () =>{
  anchor.setProvider(anchor.Provider.env());

  const [_programAuthority, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [SEED],
    mainProgram.programId
  )
  programAuthority = _programAuthority
  nonce = _nonce

  someToken = await createToken(connection, wallet, programAuthority)

  staking = await someToken.createAccount(programAuthority)
  

})


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




let owner = Keypair.generate()
let staking: PublicKey
let tokens: PublicKey


describe('Simple', () => {

  it('Mint', async () => {

    staking = await someToken.createAccount(programAuthority)
    tokens = await someToken.createAccount(owner.publicKey)

    await mainProgram.rpc.mintTokens(nonce, {
      accounts: {
        mint: someToken.publicKey,
        auth: programAuthority,
        owner: owner.publicKey,
        tokens,
        tokenProgram: TOKEN_PROGRAM,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY
      }, signers: [owner]
    })

    const { amount } = await someToken.getAccountInfo(tokens)
    // assert.ok(amount.eq(new u64(50)))
  })

  it('transfer', async () => {
    const approveIx = await Token.createApproveInstruction(
      TOKEN_PROGRAM,
      tokens,
      programAuthority,
      owner.publicKey,
      [],
      new u64(42)
    )

    const depositIx = await mainProgram.instruction.deposit(to64(42), {
      accounts: {
          owner: owner.publicKey,
          exchangeAccount: staking,
          collateralAccount: tokens,
          userCollateralAccount: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM,
          exchangeAuthority: programAuthority
      }
  })






  })

});


async function depositInstruction( amount, exchangeAccount, userCollateralAccount, owner ) {
  return 
}


function to64(amount) {
  return new u64(amount.toString())
}