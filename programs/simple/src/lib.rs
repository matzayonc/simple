use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, TokenAccount, Transfer};
const SEED: &str = "Synthetify";


#[program]
pub mod simple {
    use super::*;

    pub fn mint_tokens(ctx: Context<MintTokens>, nonce: u8) -> ProgramResult {
        let seeds = &[SEED.as_bytes(), &[nonce], ];
        let signer = &[&seeds[..]];
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.tokens.to_account_info(),
            authority: ctx.accounts.auth.clone()
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, 50)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    mint: CpiAccount<'info, Mint>,
    auth: AccountInfo<'info>,
    #[account(signer)]
    owner: AccountInfo<'info>,
    #[account(mut)]
    tokens: CpiAccount<'info, TokenAccount>,
    token_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}
