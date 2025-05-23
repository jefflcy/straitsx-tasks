//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.0;

// This is the main building block for smart contracts.
contract Token {
    // Some string type variables to identify the token.
    string public name = "My Hardhat Token";
    string public symbol = "MHT";
    
    // The fixed amount of tokens, stored in an unsigned integer type variable.
    uint256 public totalSupply = 1000000;
    
    // An address type variable is used to store ethereum accounts.
    address public owner;
    
    // A mapping is a key/value map. Here we store each account's balance.
    mapping(address => uint256) balances;
    
    // Interest rate: 2% per 5-minute block (represented as 200 basis points per 10000)
    uint256 public constant INTEREST_RATE_BASIS_POINTS = 200;
    uint256 public constant BASIS_POINTS_DENOMINATOR = 10000;
    uint256 public constant INTEREST_BLOCK_INTERVAL = 5 minutes;
    
    // Deposit tracking structure
    struct Deposit {
        uint256 amount;           // Amount deposited
        uint256 timestamp;        // When the deposit was made
        bool exists;              // Flag to check if deposit exists
    }
    
    // Mapping to store deposits for each address
    mapping(address => Deposit) public deposits;
    
    // Total amount currently deposited in the contract
    uint256 public totalDeposited;
    
    // Reserve pool for interest payments
    uint256 public interestPool;
    
    // The Transfer event helps off-chain applications understand
    // what happens within your contract.
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    
    // Event emitted when tokens are deposited
    event TokensDeposited(address indexed depositor, uint256 amount, uint256 timestamp);
    
    // Event emitted when tokens are withdrawn
    event TokensWithdrawn(address indexed depositor, uint256 principal, uint256 interest, uint256 total);
    
    /**
     * Contract initialization.
     */
    constructor() {
        // Reserve 100,000 tokens (10%) for interest payments
        interestPool = 100000;
        balances[msg.sender] = totalSupply - interestPool;
        owner = msg.sender;
    }
    
    /**
     * Deposit function allows token holders to deposit tokens for interest.
     * Only one active deposit per address is allowed.
     * 
     * @param amount The amount of tokens to deposit
     */
    function deposit(uint256 amount) external {
        // Check if the sender has enough tokens
        require(balances[msg.sender] >= amount, "Insufficient token balance");
        
        // Check if amount is greater than 0
        require(amount > 0, "Deposit amount must be greater than 0");
        
        // Check if user doesn't already have an active deposit
        require(!deposits[msg.sender].exists, "Active deposit already exists. Withdraw first.");
        
        // Transfer tokens from sender's balance to contract
        balances[msg.sender] -= amount;
        totalDeposited += amount;
        
        // Record the deposit
        deposits[msg.sender] = Deposit({
            amount: amount,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Emit deposit event
        emit TokensDeposited(msg.sender, amount, block.timestamp);
    }
    
    /**
     * Withdraw function allows depositors to withdraw their tokens plus earned interest.
     * Interest is calculated at 2% per 5-minute interval, rounded down.
     * Only the original depositor can withdraw their deposit.
     */
    function withdraw() external {
        // Check if user has an active deposit
        require(deposits[msg.sender].exists, "No active deposit found");
        
        Deposit storage userDeposit = deposits[msg.sender];
        
        // Calculate time elapsed since deposit
        uint256 timeElapsed = block.timestamp - userDeposit.timestamp;
        
        // Calculate number of complete 5-minute intervals
        uint256 intervals = timeElapsed / INTEREST_BLOCK_INTERVAL;
        
        // Calculate interest (rounded down)
        uint256 interest = (userDeposit.amount * INTEREST_RATE_BASIS_POINTS * intervals) / BASIS_POINTS_DENOMINATOR;
        
        // Check if contract has enough tokens for interest payment
        require(interest <= interestPool, "Insufficient interest pool");
        
        // Total amount to withdraw (principal + interest)
        uint256 totalWithdrawal = userDeposit.amount + interest;
        
        // Update contract state
        uint256 principal = userDeposit.amount;
        totalDeposited -= principal;
        interestPool -= interest;
        
        // Clear the deposit
        delete deposits[msg.sender];
        
        // Transfer tokens back to user
        balances[msg.sender] += totalWithdrawal;
        
        // Emit withdrawal event
        emit TokensWithdrawn(msg.sender, principal, interest, totalWithdrawal);
    }
    
    /**
     * View function to calculate current interest earned on a deposit.
     * 
     * @param depositor The address of the depositor
     * @return principal The original deposit amount
     * @return interest The current interest earned
     * @return total The total amount available for withdrawal
     */
    function calculateInterest(address depositor) external view returns (uint256 principal, uint256 interest, uint256 total) {
        require(deposits[depositor].exists, "No active deposit found");
        
        Deposit storage userDeposit = deposits[depositor];
        
        // Calculate time elapsed since deposit
        uint256 timeElapsed = block.timestamp - userDeposit.timestamp;
        
        // Calculate number of complete 5-minute intervals
        uint256 intervals = timeElapsed / INTEREST_BLOCK_INTERVAL;
        
        // Calculate interest (rounded down)
        principal = userDeposit.amount;
        interest = (principal * INTEREST_RATE_BASIS_POINTS * intervals) / BASIS_POINTS_DENOMINATOR;
        total = principal + interest;
        
        return (principal, interest, total);
    }
    
    /**
     * A function to transfer tokens.
     *
     * The external modifier makes a function *only* callable from *outside*
     * the contract.
     */
    function transfer(address to, uint256 amount) external {
        // Check if the transaction sender has enough tokens.
        // If require's first argument evaluates to false then the
        // transaction will revert.
        require(balances[msg.sender] >= amount, "Not enough tokens");
        
        // Transfer the amount.
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        // Notify off-chain applications of the transfer.
        emit Transfer(msg.sender, to, amount);
    }
    
    /**
     * Read only function to retrieve the token balance of a given account.
     *
     * The view modifier indicates that it doesn't modify the contract's
     * state, which allows us to call it without executing a transaction.
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}