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


    pub fn deposit(ctx: Context<Deposit>, amount: u64, nonce: u8) -> Result<()> {
        msg!("Syntetify: DEPOSIT");

        //let exchange_collateral_balance = ctx.accounts.collateral_account.amount;
        let user_collateral_account = &mut ctx.accounts.user_collateral_account;

        let tx_signer = ctx.accounts.owner.key;
        // Signer need to be owner of source account
        if !tx_signer.eq(&user_collateral_account.owner) {
            return Err(ErrorCode::InvalidSigner.into());
        }

        // Transfer token
        let seeds = &[SEED.as_bytes(), &[nonce]];
        let signer = &[&seeds[..]];
        let cpi_ctx = CpiContext::from(&*ctx.accounts).with_signer(signer);

        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

}


#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub collateral_account: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_collateral_account: CpiAccount<'info, TokenAccount>,
    #[account("token_program.key == &token::ID")]
    pub token_program: AccountInfo<'info>,
    // owner can deposit to any exchange_account
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    pub exchange_authority: AccountInfo<'info>,
}
impl<'a, 'b, 'c, 'info> From<&Deposit<'info>> for CpiContext<'a, 'b, 'c, 'info, Transfer<'info>> {
    fn from(accounts: &Deposit<'info>) -> CpiContext<'a, 'b, 'c, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: accounts.user_collateral_account.to_account_info(),
            to: accounts.collateral_account.to_account_info(),
            authority: accounts.exchange_authority.to_account_info(),
        };
        let cpi_program = accounts.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
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

#[error]
pub enum ErrorCode {
    #[msg("There can't be more than 5 users.")]
    MoreThanFiveUsers,
    #[msg("You are not authorized")]
    Unauthorized,
    #[msg("Invalid Signer")]
    InvalidSigner
}
