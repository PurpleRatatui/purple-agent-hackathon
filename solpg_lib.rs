use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod solsage {
    use super::*;

    /// Initialize the SolSage protocol
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let protocol = &mut ctx.accounts.protocol;
        protocol.authority = ctx.accounts.authority.key();
        protocol.total_knowledge_entries = 0;
        protocol.total_attributions = 0;
        protocol.reward_per_attribution = 1_000_000; // 1 SAGE (6 decimals)
        protocol.bump = ctx.bumps.protocol;
        
        msg!("SolSage Protocol initialized!");
        Ok(())
    }

    /// Stake knowledge to the protocol
    pub fn stake_knowledge(
        ctx: Context<StakeKnowledge>,
        content_hash: [u8; 32],
        title: String,
        category: String,
    ) -> Result<()> {
        require!(title.len() <= 100, SolSageError::TitleTooLong);
        require!(category.len() <= 50, SolSageError::CategoryTooLong);

        let knowledge = &mut ctx.accounts.knowledge_entry;
        knowledge.staker = ctx.accounts.staker.key();
        knowledge.content_hash = content_hash;
        knowledge.title = title.clone();
        knowledge.category = category;
        knowledge.created_at = Clock::get()?.unix_timestamp;
        knowledge.total_attributions = 0;
        knowledge.pending_rewards = 0;
        knowledge.is_active = true;
        knowledge.bump = ctx.bumps.knowledge_entry;

        let protocol = &mut ctx.accounts.protocol;
        protocol.total_knowledge_entries += 1;

        msg!("Knowledge staked: {}", title);

        Ok(())
    }

    /// Record an attribution when knowledge is used
    pub fn record_attribution(
        ctx: Context<RecordAttribution>,
        query_hash: [u8; 32],
        relevance_score: u8,
    ) -> Result<()> {
        require!(relevance_score <= 100, SolSageError::InvalidRelevanceScore);

        let attribution = &mut ctx.accounts.attribution;
        attribution.knowledge_entry = ctx.accounts.knowledge_entry.key();
        attribution.query_hash = query_hash;
        attribution.relevance_score = relevance_score;
        attribution.timestamp = Clock::get()?.unix_timestamp;
        attribution.reward_claimed = false;
        attribution.bump = ctx.bumps.attribution;

        // Update knowledge entry stats
        let knowledge = &mut ctx.accounts.knowledge_entry;
        knowledge.total_attributions += 1;
        
        // Calculate reward based on relevance
        let base_reward = ctx.accounts.protocol.reward_per_attribution;
        let reward = (base_reward * relevance_score as u64) / 10;
        knowledge.pending_rewards += reward;

        // Update protocol stats
        let protocol = &mut ctx.accounts.protocol;
        protocol.total_attributions += 1;

        msg!("Attribution recorded, reward: {}", reward);

        Ok(())
    }

    /// Claim pending rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let knowledge = &mut ctx.accounts.knowledge_entry;
        
        require!(knowledge.pending_rewards > 0, SolSageError::NoRewardsToClaim);
        require!(
            knowledge.staker == ctx.accounts.staker.key(),
            SolSageError::NotKnowledgeOwner
        );

        let reward_amount = knowledge.pending_rewards;
        knowledge.pending_rewards = 0;

        // In MVP, we just log - actual token transfer would happen here
        msg!("Claimed {} SAGE tokens for staker {}", reward_amount, ctx.accounts.staker.key());

        Ok(())
    }
}

// ============================================================================
// ACCOUNTS
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Protocol::INIT_SPACE,
        seeds = [b"protocol"],
        bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(content_hash: [u8; 32])]
pub struct StakeKnowledge<'info> {
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    #[account(
        init,
        payer = staker,
        space = 8 + KnowledgeEntry::INIT_SPACE,
        seeds = [b"knowledge", staker.key().as_ref(), &content_hash],
        bump
    )]
    pub knowledge_entry: Account<'info, KnowledgeEntry>,
    
    #[account(mut)]
    pub staker: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(query_hash: [u8; 32])]
pub struct RecordAttribution<'info> {
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    #[account(mut)]
    pub knowledge_entry: Account<'info, KnowledgeEntry>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + Attribution::INIT_SPACE,
        seeds = [b"attribution", &query_hash, knowledge_entry.key().as_ref()],
        bump
    )]
    pub attribution: Account<'info, Attribution>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub knowledge_entry: Account<'info, KnowledgeEntry>,
    
    pub staker: Signer<'info>,
}

// ============================================================================
// STATE
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct Protocol {
    pub authority: Pubkey,
    pub total_knowledge_entries: u64,
    pub total_attributions: u64,
    pub reward_per_attribution: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct KnowledgeEntry {
    pub staker: Pubkey,
    pub content_hash: [u8; 32],
    #[max_len(100)]
    pub title: String,
    #[max_len(50)]
    pub category: String,
    pub created_at: i64,
    pub total_attributions: u64,
    pub pending_rewards: u64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Attribution {
    pub knowledge_entry: Pubkey,
    pub query_hash: [u8; 32],
    pub relevance_score: u8,
    pub timestamp: i64,
    pub reward_claimed: bool,
    pub bump: u8,
}

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum SolSageError {
    #[msg("Title must be 100 characters or less")]
    TitleTooLong,
    #[msg("Category must be 50 characters or less")]
    CategoryTooLong,
    #[msg("Relevance score must be between 0 and 100")]
    InvalidRelevanceScore,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    #[msg("Only the knowledge owner can perform this action")]
    NotKnowledgeOwner,
}
