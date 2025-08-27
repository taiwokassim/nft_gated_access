use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

declare_id!("Fg6PaFpoGXkYsidMpWxqSWd8w9egY8j4cxrCzr3iP4Rk");

#[program]
pub mod nft_gated_access {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let acct = &mut ctx.accounts.gated_account;
        acct.counter = 0;
        Ok(())
    }

    pub fn exclusive_action(ctx: Context<ExclusiveAction>) -> Result<()> {
        // The token_account passed must belong to the user (owner checks are done by Anchor signer requirement)
        let token_account = &ctx.accounts.user_token_account;

        // Ensure amount >= 1
        require!(token_account.amount >= 1, CustomError::NoNftOwned);

        // perform gated action: increment the counter
        let gated = &mut ctx.accounts.gated_account;
        gated.counter = gated
            .counter
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + 8)]
    pub gated_account: Account<'info, GatedAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExclusiveAction<'info> {
    #[account(mut)]
    pub gated_account: Account<'info, GatedAccount>,
    /// CHECK: this is the user's token account for the required NFT mint — validated below
    #[account(mut, constraint = user_token_account.owner == *user.key)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[account]
pub struct GatedAccount {
    pub counter: u64,
}

#[error_code]
pub enum CustomError {
    #[msg("User does not own the required NFT.")]
    NoNftOwned,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Overflow error")]
    Overflow,
}
