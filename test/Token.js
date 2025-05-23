const { expect } = require('chai');
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Token contract", function () {
    describe("Deployment", function () {
        it("should deploy the token contract", async function () {
            const hardhatToken = await ethers.deployContract("Token");
            expect(hardhatToken.target).to.not.be.undefined;
        })

        it("should have the correct name and symbol", async function () {
            const hardhatToken = await ethers.deployContract("Token");
            const name = await hardhatToken.name();
            const symbol = await hardhatToken.symbol();

            expect(name).to.equal("My Hardhat Token");
            expect(symbol).to.equal("MHT");
        })

        it("should assign correct supply distribution to owner", async function () {
            const hardhatToken = await ethers.deployContract("Token");
            const [owner] = await ethers.getSigners();
            const balance = await hardhatToken.balanceOf(owner.address);
            const interestPool = await hardhatToken.interestPool();

            // Owner should have totalSupply minus interest pool
            expect(balance).to.equal(900000);
            expect(interestPool).to.equal(100000);
            expect(await hardhatToken.totalSupply()).to.equal(1000000);
        })
    })

    describe("Transactions", function () {
        it("should transfer tokens between accounts", async function () {
            const hardhatToken = await ethers.deployContract("Token");
            const [owner, addr1, addr2] = await ethers.getSigners();

            // Transfer 50 tokens from owner to addr1
            await expect(
                hardhatToken.transfer(addr1.address, 50)
            ).to.changeTokenBalances(hardhatToken, [owner, addr1], [-50, 50]);

            // Transfer 50 tokens from addr1 to addr2
            await expect(
                hardhatToken.connect(addr1).transfer(addr2.address, 50)
            ).to.changeTokenBalances(hardhatToken, [addr1, addr2], [-50, 50]);
        })
    })

    describe("Deposit and Withdrawal", function () {
        it("should transfer 1000 tokens to a second account", async function () {
            const hardhatToken = await ethers.deployContract("Token");
            const [owner, addr1] = await ethers.getSigners();

            // Transfer 1000 tokens from owner to addr1
            await expect(
                hardhatToken.transfer(addr1.address, 1000)
            ).to.changeTokenBalances(hardhatToken, [owner, addr1], [-1000, 1000]);

            // Verify addr1 has 1000 tokens
            expect(await hardhatToken.balanceOf(addr1.address)).to.equal(1000);
        })

        it("should deposit 500 tokens from the second account", async function () {
            const hardhatToken = await ethers.deployContract("Token");
            const [owner, addr1] = await ethers.getSigners();

            // Transfer 1000 tokens to addr1 first
            await hardhatToken.transfer(addr1.address, 1000);

            // Deposit 500 tokens from addr1
            await expect(
                hardhatToken.connect(addr1).deposit(500)
            ).to.emit(hardhatToken, "TokensDeposited")
              .withArgs(addr1.address, 500, await time.latest());

            // Verify addr1's balance decreased by 500
            expect(await hardhatToken.balanceOf(addr1.address)).to.equal(500);

            // Verify total deposited increased
            expect(await hardhatToken.totalDeposited()).to.equal(500);

            // Verify deposit record exists
            const deposit = await hardhatToken.deposits(addr1.address);
            expect(deposit.amount).to.equal(500);
            expect(deposit.exists).to.be.true;
        })

        it("should withdraw 500 tokens plus interest after 5 minutes", async function () {
            const hardhatToken = await ethers.deployContract("Token");
            const [owner, addr1] = await ethers.getSigners();

            // Setup: Transfer tokens and make deposit
            await hardhatToken.transfer(addr1.address, 1000);
            await hardhatToken.connect(addr1).deposit(500);

            // Fast forward 5 minutes (300 seconds)
            await time.increase(300);

            // Calculate expected interest: 500 * 200 / 10000 * 1 interval = 10 tokens
            const expectedInterest = 10;
            const expectedTotal = 500 + expectedInterest;

            // Withdraw tokens
            await expect(
                hardhatToken.connect(addr1).withdraw()
            ).to.emit(hardhatToken, "TokensWithdrawn")
              .withArgs(addr1.address, 500, expectedInterest, expectedTotal);

            // Verify addr1's balance increased by principal + interest
            expect(await hardhatToken.balanceOf(addr1.address)).to.equal(500 + expectedTotal);

            // Verify total deposited reset to 0
            expect(await hardhatToken.totalDeposited()).to.equal(0);

            // Verify interest pool decreased
            expect(await hardhatToken.interestPool()).to.equal(100000 - expectedInterest);

            // Verify deposit record no longer exists
            const deposit = await hardhatToken.deposits(addr1.address);
            expect(deposit.exists).to.be.false;
        })

        it("should query account's new balance after deposit withdrawal", async function () {
            const hardhatToken = await ethers.deployContract("Token");
            const [owner, addr1] = await ethers.getSigners();

            // Setup: Transfer tokens and make deposit
            await hardhatToken.transfer(addr1.address, 1000);
            const initialBalance = await hardhatToken.balanceOf(addr1.address);
            
            await hardhatToken.connect(addr1).deposit(500);
            const balanceAfterDeposit = await hardhatToken.balanceOf(addr1.address);

            // Fast forward 5 minutes
            await time.increase(300);

            // Withdraw tokens
            await hardhatToken.connect(addr1).withdraw();

            // Query final balance
            const finalBalance = await hardhatToken.balanceOf(addr1.address);

            // Verify balance progression
            expect(initialBalance).to.equal(1000);
            expect(balanceAfterDeposit).to.equal(500);
            expect(finalBalance).to.equal(1010); // 500 remaining + 500 principal + 10 interest

            // Additional verification: balance should be higher than initial due to interest
            expect(finalBalance).to.be.greaterThan(initialBalance);
            expect(finalBalance - initialBalance).to.equal(10); // Interest earned
        })

        it("should calculate interest correctly for multiple time intervals", async function () {
            const hardhatToken = await ethers.deployContract("Token");
            const [owner, addr1] = await ethers.getSigners();

            // Setup
            await hardhatToken.transfer(addr1.address, 1000);
            await hardhatToken.connect(addr1).deposit(500);

            // Fast forward 15 minutes (3 intervals)
            await time.increase(900);

            // Calculate expected interest: 500 * 200 / 10000 * 3 intervals = 30 tokens
            const [principal, interest, total] = await hardhatToken.calculateInterest(addr1.address);

            expect(principal).to.equal(500);
            expect(interest).to.equal(30);
            expect(total).to.equal(530);

            // Verify withdrawal matches calculation
            await expect(
                hardhatToken.connect(addr1).withdraw()
            ).to.emit(hardhatToken, "TokensWithdrawn")
              .withArgs(addr1.address, 500, 30, 530);
        })
    })
})