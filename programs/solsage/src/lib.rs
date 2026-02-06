use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    clock::Clock,
    sysvar::Sysvar,
    rent::Rent,
    system_instruction,
    program::invoke_signed,
};
use thiserror::Error;

// Program ID placeholder - will be replaced after deployment
solana_program::declare_id!("11111111111111111111111111111111");

// ============================================================================
// ENTRYPOINT
// ============================================================================

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = SolSageInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        SolSageInstruction::Initialize => {
            msg!("Instruction: Initialize");
            process_initialize(program_id, accounts)
        }
        SolSageInstruction::StakeKnowledge { content_hash, title, category } => {
            msg!("Instruction: StakeKnowledge");
            process_stake_knowledge(program_id, accounts, content_hash, title, category)
        }
        SolSageInstruction::RecordAttribution { query_hash, relevance_score } => {
            msg!("Instruction: RecordAttribution");
            process_record_attribution(program_id, accounts, query_hash, relevance_score)
        }
        SolSageInstruction::ClaimRewards => {
            msg!("Instruction: ClaimRewards");
            process_claim_rewards(program_id, accounts)
        }
    }
}

// ============================================================================
// INSTRUCTIONS
// ============================================================================

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum SolSageInstruction {
    /// Initialize the protocol
    /// Accounts:
    /// 0. [writable, signer] Protocol authority
    /// 1. [writable] Protocol account (PDA)
    /// 2. [] System program
    Initialize,

    /// Stake knowledge
    /// Accounts:
    /// 0. [writable, signer] Staker
    /// 1. [writable] Protocol account
    /// 2. [writable] Knowledge entry account (PDA)
    /// 3. [] System program
    StakeKnowledge {
        content_hash: [u8; 32],
        title: String,
        category: String,
    },

    /// Record an attribution
    /// Accounts:
    /// 0. [writable, signer] Payer
    /// 1. [writable] Protocol account
    /// 2. [writable] Knowledge entry account
    /// 3. [writable] Attribution account (PDA)
    /// 4. [] System program
    RecordAttribution {
        query_hash: [u8; 32],
        relevance_score: u8,
    },

    /// Claim rewards
    /// Accounts:
    /// 0. [signer] Staker
    /// 1. [writable] Knowledge entry account
    ClaimRewards,
}

// ============================================================================
// STATE
// ============================================================================

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Protocol {
    pub is_initialized: bool,
    pub authority: Pubkey,
    pub total_knowledge_entries: u64,
    pub total_attributions: u64,
    pub reward_per_attribution: u64,
    pub bump: u8,
}

impl Protocol {
    pub const LEN: usize = 1 + 32 + 8 + 8 + 8 + 1;
    pub const SEED: &'static [u8] = b"protocol";
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct KnowledgeEntry {
    pub is_initialized: bool,
    pub staker: Pubkey,
    pub content_hash: [u8; 32],
    pub title: String,
    pub category: String,
    pub created_at: i64,
    pub total_attributions: u64,
    pub pending_rewards: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl KnowledgeEntry {
    pub const LEN: usize = 1 + 32 + 32 + 4 + 100 + 4 + 50 + 8 + 8 + 8 + 1 + 1;
    pub const SEED: &'static [u8] = b"knowledge";
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Attribution {
    pub is_initialized: bool,
    pub knowledge_entry: Pubkey,
    pub query_hash: [u8; 32],
    pub relevance_score: u8,
    pub timestamp: i64,
    pub reward_claimed: bool,
    pub bump: u8,
}

impl Attribution {
    pub const LEN: usize = 1 + 32 + 32 + 1 + 8 + 1 + 1;
    pub const SEED: &'static [u8] = b"attribution";
}

// ============================================================================
// ERRORS
// ============================================================================

#[derive(Error, Debug)]
pub enum SolSageError {
    #[error("Account already initialized")]
    AlreadyInitialized,
    #[error("Title too long")]
    TitleTooLong,
    #[error("Category too long")]
    CategoryTooLong,
    #[error("Invalid relevance score")]
    InvalidRelevanceScore,
    #[error("No rewards to claim")]
    NoRewardsToClaim,
    #[error("Not knowledge owner")]
    NotKnowledgeOwner,
    #[error("Invalid PDA")]
    InvalidPda,
}

impl From<SolSageError> for ProgramError {
    fn from(e: SolSageError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

// ============================================================================
// PROCESSORS
// ============================================================================

fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let protocol_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Derive PDA
    let (protocol_pda, bump) = Pubkey::find_program_address(
        &[Protocol::SEED],
        program_id,
    );

    if protocol_pda != *protocol_account.key {
        return Err(SolSageError::InvalidPda.into());
    }

    // Create account
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(Protocol::LEN);
    
    invoke_signed(
        &system_instruction::create_account(
            authority.key,
            protocol_account.key,
            lamports,
            Protocol::LEN as u64,
            program_id,
        ),
        &[authority.clone(), protocol_account.clone(), system_program.clone()],
        &[&[Protocol::SEED, &[bump]]],
    )?;

    // Initialize data
    let protocol = Protocol {
        is_initialized: true,
        authority: *authority.key,
        total_knowledge_entries: 0,
        total_attributions: 0,
        reward_per_attribution: 1_000_000, // 1 SAGE (6 decimals)
        bump,
    };

    protocol.serialize(&mut &mut protocol_account.data.borrow_mut()[..])?;
    
    msg!("SolSage Protocol initialized!");
    Ok(())
}

fn process_stake_knowledge(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    content_hash: [u8; 32],
    title: String,
    category: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let protocol_account = next_account_info(account_info_iter)?;
    let knowledge_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !staker.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if title.len() > 100 {
        return Err(SolSageError::TitleTooLong.into());
    }
    if category.len() > 50 {
        return Err(SolSageError::CategoryTooLong.into());
    }

    // Derive knowledge PDA
    let (knowledge_pda, bump) = Pubkey::find_program_address(
        &[KnowledgeEntry::SEED, staker.key.as_ref(), &content_hash],
        program_id,
    );

    if knowledge_pda != *knowledge_account.key {
        return Err(SolSageError::InvalidPda.into());
    }

    // Create knowledge account
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(KnowledgeEntry::LEN);
    
    invoke_signed(
        &system_instruction::create_account(
            staker.key,
            knowledge_account.key,
            lamports,
            KnowledgeEntry::LEN as u64,
            program_id,
        ),
        &[staker.clone(), knowledge_account.clone(), system_program.clone()],
        &[&[KnowledgeEntry::SEED, staker.key.as_ref(), &content_hash, &[bump]]],
    )?;

    // Initialize knowledge entry
    let clock = Clock::get()?;
    let knowledge = KnowledgeEntry {
        is_initialized: true,
        staker: *staker.key,
        content_hash,
        title: title.clone(),
        category,
        created_at: clock.unix_timestamp,
        total_attributions: 0,
        pending_rewards: 0,
        is_active: true,
        bump,
    };

    knowledge.serialize(&mut &mut knowledge_account.data.borrow_mut()[..])?;

    // Update protocol
    let mut protocol = Protocol::try_from_slice(&protocol_account.data.borrow())?;
    protocol.total_knowledge_entries += 1;
    protocol.serialize(&mut &mut protocol_account.data.borrow_mut()[..])?;

    msg!("Knowledge staked: {}", title);
    Ok(())
}

fn process_record_attribution(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    query_hash: [u8; 32],
    relevance_score: u8,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let payer = next_account_info(account_info_iter)?;
    let protocol_account = next_account_info(account_info_iter)?;
    let knowledge_account = next_account_info(account_info_iter)?;
    let attribution_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if relevance_score > 100 {
        return Err(SolSageError::InvalidRelevanceScore.into());
    }

    // Derive attribution PDA
    let (attribution_pda, bump) = Pubkey::find_program_address(
        &[Attribution::SEED, &query_hash, knowledge_account.key.as_ref()],
        program_id,
    );

    if attribution_pda != *attribution_account.key {
        return Err(SolSageError::InvalidPda.into());
    }

    // Create attribution account
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(Attribution::LEN);
    
    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            attribution_account.key,
            lamports,
            Attribution::LEN as u64,
            program_id,
        ),
        &[payer.clone(), attribution_account.clone(), system_program.clone()],
        &[&[Attribution::SEED, &query_hash, knowledge_account.key.as_ref(), &[bump]]],
    )?;

    // Update knowledge entry
    let mut knowledge = KnowledgeEntry::try_from_slice(&knowledge_account.data.borrow())?;
    knowledge.total_attributions += 1;
    
    // Calculate reward
    let protocol = Protocol::try_from_slice(&protocol_account.data.borrow())?;
    let reward = (protocol.reward_per_attribution * relevance_score as u64) / 10;
    knowledge.pending_rewards += reward;
    knowledge.serialize(&mut &mut knowledge_account.data.borrow_mut()[..])?;

    // Create attribution
    let clock = Clock::get()?;
    let attribution = Attribution {
        is_initialized: true,
        knowledge_entry: *knowledge_account.key,
        query_hash,
        relevance_score,
        timestamp: clock.unix_timestamp,
        reward_claimed: false,
        bump,
    };
    attribution.serialize(&mut &mut attribution_account.data.borrow_mut()[..])?;

    // Update protocol
    let mut protocol = Protocol::try_from_slice(&protocol_account.data.borrow())?;
    protocol.total_attributions += 1;
    protocol.serialize(&mut &mut protocol_account.data.borrow_mut()[..])?;

    msg!("Attribution recorded, reward: {}", reward);
    Ok(())
}

fn process_claim_rewards(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let knowledge_account = next_account_info(account_info_iter)?;

    if !staker.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut knowledge = KnowledgeEntry::try_from_slice(&knowledge_account.data.borrow())?;
    
    if knowledge.staker != *staker.key {
        return Err(SolSageError::NotKnowledgeOwner.into());
    }

    if knowledge.pending_rewards == 0 {
        return Err(SolSageError::NoRewardsToClaim.into());
    }

    let reward_amount = knowledge.pending_rewards;
    knowledge.pending_rewards = 0;
    knowledge.serialize(&mut &mut knowledge_account.data.borrow_mut()[..])?;

    // In MVP, we just log - actual token transfer would happen here
    msg!("Claimed {} SAGE tokens", reward_amount);
    Ok(())
}
