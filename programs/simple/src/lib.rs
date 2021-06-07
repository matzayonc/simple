use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, TokenAccount, Transfer};
const SEED: &str = "Synthetify";

#[program]
pub mod simple {
    use super::*;

    pub fn mint_tokens(ctx: Context<MintTokens>, nonce: u8) -> ProgramResult {
        // create program signer
        let seeds = &[SEED.as_bytes(), &[nonce], ];
        let signer = &[&seeds[..]];

        // create context
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.tokens.to_account_info(),
            authority: ctx.accounts.auth.clone()
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        // transfer funds
        token::mint_to(cpi_ctx, 50)?;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64, nonce: u8) -> ProgramResult {
        // create program signer
        let seeds = &[SEED.as_bytes(), &[nonce]];
        let signer = &[&seeds[..]];

        // create context
        let cpi_accounts = Transfer {
            from: ctx.accounts.sender.to_account_info(),
            to: ctx.accounts.collateral_account.to_account_info(),
            authority: ctx.accounts.exchange_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        // transfer funds
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub collateral_account: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    pub sender: CpiAccount<'info, TokenAccount>,
    #[account("token_program.key == &token::ID")]
    pub token_program: AccountInfo<'info>,
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    pub exchange_authority: AccountInfo<'info>,
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