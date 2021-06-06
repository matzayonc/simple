import * as anchor from '@project-serum/anchor'
import { Program } from '@project-serum/anchor'
import { TokenInstructions } from '@project-serum/serum'
import { PublicKey, Keypair, Connection } from '@solana/web3.js'
import { Token, u64 } from '@solana/spl-token'


const SEED = Buffer.from('Synthetify')
const TOKEN_PROGRAM = TokenInstructions.TOKEN_PROGRAM_ID
export const mainProgram = anchor.workspace.Simple as Program
let nonce: number

const provider = anchor.Provider.local()
const connection = provider.connection
const wallet = (provider.wallet as unknown as { payer: Keypair }).payer

let programAuthority: PublicKey
export let someToken: Token
let staking: PublicKey


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







describe('simple', () => {

  it('Mint', async () => {

    let owner = Keypair.generate()

    let staking = await someToken.createAccount(programAuthority)
    let tokens = await someToken.createAccount(owner.publicKey)

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
    console.log(amount)
    

  })
});
