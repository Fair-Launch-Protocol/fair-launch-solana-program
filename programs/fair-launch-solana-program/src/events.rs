use anchor_lang::{*, prelude::*};

#[event]
pub struct TradeEvent {
    pub trader: Pubkey,
    pub asset: Pubkey,
    pub is_buy: bool,
    pub amount_in: u64,
    pub amount_out: u64,
}

#[event]
pub struct LaunchEvent {
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}