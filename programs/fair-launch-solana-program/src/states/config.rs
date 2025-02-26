use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub fee_recipient: Pubkey,

    pub lamports_needed_to_complete_curve: u64,

    pub total_token_supply: u64,

    pub buy_fee_percent: f64,
    pub sell_fee_percent: f64,
}
