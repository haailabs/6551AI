    const connectWalletBtn = document.getElementById("connectWallet");
    const getMessageBtn = document.getElementById("getMessage");
    const statusEl = document.getElementById("status");
    const nftSelect = document.getElementById("nftSelect");
    let account = null;

    const ERC6551_REGISTRY_ADDRESS =
        "0xf4DCf17d5F681d477723f00863821E837aE51EF9"; // Address of the deployed ERC6551Registry
    const ERC6551_ACCOUNT_IMPLEMENTATION_ADDRESS =
        "0x46C24A47Cd80Ef61Dde6ac6961ce05F366Cc3E8B"; // Address of the deployed ERC6551Account
    const CHAIN_ID = 137; // Polygon mainnet

    connectWalletBtn.addEventListener("click", async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                // Check current network
                const chainId = await ethereum.request({ method: 'eth_chainId' });

                // If not on Polygon Mainnet (chainId 0x89), then switch
                if (chainId !== '0x89') {
                    try {
                        await ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: '0x89' }],
                        });
                    } catch (switchError) {
                        // This error code indicates that the chain has not been added to MetaMask
                        if (switchError.code === 4902) {
                            try {
                                await ethereum.request({
                                    method: 'wallet_addEthereumChain',
                                    params: [{
                                        chainId: '0x89',
                                        chainName: 'Polygon Mainnet',
                                        nativeCurrency: {
                                            name: 'MATIC',
                                            symbol: 'MATIC',
                                            decimals: 18
                                        },
                                        rpcUrls: ['https://polygon-rpc.com/'],
                                        blockExplorerUrls: ['https://polygonscan.com/']
                                    }],
                                });
                            } catch (addError) {
                                throw addError;
                            }
                        } else {
                            throw switchError;
                        }
                    }
                }

                // Now connect the wallet
                const accounts = await ethereum.request({
                    method: "eth_requestAccounts",
                });
                account = accounts[0];
                statusEl.textContent = `Wallet connected to Polygon: ${account.slice(0, 6)}...${account.slice(-4)}`;
                fetchNFTs(account);
            } catch (error) {
                console.error(error);
                statusEl.textContent = "Failed to connect wallet or switch to Polygon";
            }
        } else {
            statusEl.textContent = "Please install MetaMask!";
        }
    });

    async function fetchNFTs(address) {
        try {
            const response = await fetch(`/api/nfts/${address}`);
            const nfts = await response.json();
            const enrichedNFTs = nfts.map(enrichNFTData);
            populateNFTDropdown(enrichedNFTs);
        } catch (error) {
            console.error("Error fetching NFTs:", error);
            statusEl.textContent = "Failed to fetch NFTs";
        }
    }

    function enrichNFTData(nft) {
        // Resolve IPFS or other decentralized storage URLs
        nft.imageUrl = resolveIPFSUrl(nft.imageUrl);

        // Set a default image if no image is available
        if (!nft.imageUrl) {
            nft.imageUrl = "./static/default-nft.png"; // Make sure to add a default NFT image to your static folder
        }

        return nft;
    }

    function resolveIPFSUrl(url) {
        if (url.startsWith("ipfs://")) {
            return `https://ipfs.io/ipfs/${url.slice(7)}`;
        }
        return url;
    }

    function populateNFTDropdown(nfts) {
        nftSelect.innerHTML = '<option value="">Select an NFT</option>';
        nfts.forEach((nft) => {
            const option = document.createElement("option");
            option.value = `${nft.contractAddress}:${nft.tokenId}`;
            option.dataset.nftInfo = JSON.stringify(nft);

            const shortTokenId = BigInt(nft.tokenId).toString();

            const tokenName = nft.title || `Token ID: ${shortTokenId}`;
            const truncatedAddress = `${nft.contractAddress.slice(0, 6)}...${nft.contractAddress.slice(-4)}`;
            const displayName = `${tokenName} (${truncatedAddress})`;

            option.textContent = displayName;
            nftSelect.appendChild(option);
        });
        nftSelect.style.display = "block";
    }

    let selectedNFT = null;

    nftSelect.addEventListener("change", (event) => {
        const selectedOption = event.target.selectedOptions[0];
        selectedNFT = JSON.parse(selectedOption.dataset.nftInfo);
        document.getElementById("createERC6551Wallet").style.display =
            "block";
    });

    nftSelect.addEventListener("change", (event) => {
        const selectedOption = event.target.selectedOptions[0];
        const nftData = JSON.parse(selectedOption.dataset.nftInfo);
        selectedNFT = nftData;
        document.getElementById("createERC6551Wallet").style.display =
            "block";
    });
    document
        .getElementById("createERC6551Wallet")
        .addEventListener("click", async () => {
            if (!selectedNFT) return;
            const [contractAddress, tokenId] = [
                selectedNFT.contractAddress,
                selectedNFT.tokenId,
            ];
            console.log("Selected NFT:", { contractAddress, tokenId });

            if (!contractAddress || !tokenId) return;

            try {
                const provider = new ethers.providers.Web3Provider(
                    window.ethereum,
                );
                const signer = provider.getSigner();

                const registryABI = [
                    "function createAccount(address implementation, uint256 chainId, address tokenContract, uint256 tokenId, uint256 salt, bytes calldata initData) external returns (address)",
                    "function account(address implementation, uint256 chainId, address tokenContract, uint256 tokenId, uint256 salt) external view returns (address)",
                ];

                const registry = new ethers.Contract(
                    ERC6551_REGISTRY_ADDRESS,
                    registryABI,
                    signer,
                );

                // First, check if the account already exists
                const salt = ethers.constants.Zero; // You can use a different salt strategy if needed
                const accountAddress = await registry.account(
                    ERC6551_ACCOUNT_IMPLEMENTATION_ADDRESS,
                    CHAIN_ID,
                    contractAddress,
                    tokenId,
                    salt,
                );

                const accountCode =
                    await provider.getCode(accountAddress);

                if (accountCode === "0x") {
                    // Account doesn't exist, create it
                    statusEl.textContent = "Creating ERC6551 wallet...";
                    const tx = await registry.createAccount(
                        ERC6551_ACCOUNT_IMPLEMENTATION_ADDRESS,
                        CHAIN_ID,
                        contractAddress,
                        tokenId,
                        salt,
                        "0x", // No init data
                    );
                    await tx.wait();
                    statusEl.textContent = `ERC6551 wallet created: ${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`;
                } else {
                    statusEl.textContent = `Existing ERC6551 wallet found: ${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`;
                }

                console.log("ERC6551 wallet address:", accountAddress);
                // After successful creation or if wallet already exists:
                await setupERC6551Wallet(accountAddress);
            } catch (error) {
                console.error("Error:", error);
                statusEl.textContent =
                    "Failed to create/get ERC6551 wallet";
            }
        });

    const ERC6551AccountABI = [
        "function execute(address to, uint256 value, bytes calldata data, uint256 operation) external payable returns (bytes memory)",
        "function token() external view returns (uint256, address, uint256)",
        "function owner() external view returns (address)",
        "function state() external view returns (uint256)",
    ];

    let erc6551Wallet = null;

    async function setupERC6551Wallet(address) {
        const provider = new ethers.providers.Web3Provider(
            window.ethereum,
        );
        const signer = provider.getSigner();
        erc6551Wallet = new ethers.Contract(
            address,
            ERC6551AccountABI,
            signer,
        );

        document.getElementById("walletAddress").textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
        document.getElementById("walletInfo").style.display = "block";
        document.getElementById("brianInterface").style.display =
            "block";

        await updateWalletInfo();
    }

    async function updateWalletInfo() {
        if (!erc6551Wallet) return;

        const owner = await erc6551Wallet.owner();
        document.getElementById("walletOwner").textContent = `${owner.slice(0, 6)}...${owner.slice(-4)}`;

        const balance = await erc6551Wallet.provider.getBalance(
            erc6551Wallet.address,
        );
        document.getElementById("walletBalance").textContent =
            ethers.utils.formatEther(balance);
    }

    document
        .getElementById("transferButton")
        .addEventListener("click", async () => {
            const to = document.getElementById("transferTo").value;
            const amount = ethers.utils.parseEther(
                document.getElementById("transferAmount").value,
            );

            try {
                const tx = await erc6551Wallet.execute(
                    to,
                    amount,
                    "0x",
                    0,
                );
                await tx.wait();
                alert("Transfer successful!");
                await updateWalletInfo();
            } catch (error) {
                console.error("Transfer failed:", error);
                alert("Transfer failed. See console for details.");
            }
        });

    document
        .getElementById("executeButton")
        .addEventListener("click", async () => {
            const to = document.getElementById("callTo").value;
            const data = document.getElementById("callData").value;

            try {
                const tx = await erc6551Wallet.execute(to, 0, data, 0);
                await tx.wait();
                alert("Execution successful!");
                await updateWalletInfo();
            } catch (error) {
                console.error("Execution failed:", error);
                alert("Execution failed. See console for details.");
            }
        });
    // Add this to your existing JavaScript

    const BRIAN_API_KEY = "Your Brian API Key";

    document
        .getElementById("submitPrompt")
        .addEventListener("click", async () => {
            const promptInput = document.getElementById("promptInput");
            const transactionSuggestion = document.getElementById(
                "transactionSuggestion",
            );
            const transactionDetails =
                document.getElementById("transactionDetails");

            try {
                const prompt = promptInput.value;
                if (!prompt) {
                    alert("Please enter a prompt");
                }

                transactionSuggestion.style.display = "block";
                document.getElementById("chat-background")?.remove();
                                document.getElementById("message").innerText="Loading...";


                const suggestion = await getBrianSuggestions(prompt);
                                document.getElementById("message").innerText="";

                displayTransactionSuggestions(suggestion);
            } catch (error) {
                console.error(
                    "Error getting transaction suggestion:",
                    error,
                );
                transactionDetails.textContent = `Error: ${error.message}`;
                document.getElementById(
                    "approveTransaction",
                ).style.display = "none";
            }
        });



    async function getBrianSuggestions(prompt) {
        try {
            const response = await fetch(
                "https://api.brianknows.org/api/v0/agent/transaction",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-brian-api-key": BRIAN_API_KEY,
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        address: erc6551Wallet.address,
                        chainId: await getChainId(),
                    }),
                },
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("API Error:", errorText);
                throw new Error(
                    `HTTP error! status: ${response.status}, message: ${errorText}`,
                );
            }

            const data = await response.json();
            return data.result || [];
        } catch (error) {
            console.error("Error in getBrianSuggestions:", error);
            throw error;
        }
    }

    function displayTransactionSuggestions(suggestions) {
        const suggestionContainer = document.getElementById(
            "transactionSuggestions",
        );
        suggestionContainer.innerHTML = "";

        suggestions.forEach((suggestion, index) => {
            const suggestionElement = document.createElement("div");
            suggestionElement.className = "suggestion-card";
            const description = suggestion.data.description || "No description available";
            suggestionElement.innerHTML = `
                <h4 class="suggestion-title">Transaction ${index + 1}</h4>
                <p class="suggestion-description">${description}</p>
                <div class="button-container">
                    <button class="approve-btn">Approve</button>
                    <button class="details-btn">Details</button>
                </div>
                <div class="transaction-details hidden">
                    <pre>${JSON.stringify(suggestion, null, 2)}</pre>
                </div>
            `;
            suggestionElement.querySelector('.approve-btn').addEventListener('click', () => executeERC6551Transaction(suggestion));
            suggestionElement.querySelector('.details-btn').addEventListener('click', (e) => toggleDetails(e.target));
            suggestionContainer.appendChild(suggestionElement);
        });

        suggestionContainer.style.display =
            suggestions.length > 0 ? "block" : "none";
    }

    function toggleDetails(button) {
        const detailsDiv = button.parentElement.parentElement.querySelector(
            ".transaction-details",
        );
        detailsDiv.classList.toggle("hidden");
        button.textContent = detailsDiv.classList.contains("hidden")
            ? "Details"
            : "Hide Details";
    }
    // Helper function to get the current chain ID
    async function getChainId() {
        const provider = new ethers.providers.Web3Provider(
            window.ethereum,
        );
        const network = await provider.getNetwork();
        return network.chainId.toString();
    }

    async function executeERC6551Transaction(transactionDetails) {
        const step = transactionDetails.data.steps[0];

        try {
            // Check balance
            const balance = await erc6551Wallet.provider.getBalance(
                erc6551Wallet.address,
            );
            const requiredAmount = ethers.BigNumber.from(
                step.value || "0",
            );

            if (balance.lt(requiredAmount)) {
                throw new Error(
                    "Insufficient funds in the ERC6551 wallet",
                );
            }

            // Estimate gas
            let gasEstimate;

            // Execute transaction
            const tx = await erc6551Wallet.execute(
                step.to,
                step.value || "0",
                step.data || "0x",
                0,
                // Add 20% buffer to gas estimate
            );

            alert("Transaction submitted. Waiting for confirmation...");
            const receipt = await tx.wait();
            alert("Transaction executed successfully!");
            await updateWalletInfo();
        } catch (error) {
            let errorMessage = "Transaction failed: ";

            if (error.message.includes("insufficient funds")) {
                errorMessage += "Not enough MATIC to cover gas fees.";
            } else if (
                error.message.includes(
                    "Insufficient funds in the ERC6551 wallet",
                )
            ) {
                errorMessage += error.message;
            } else if (
                error.message.includes("Failed to estimate gas")
            ) {
                errorMessage += error.message;
            } else if (error.code === "ACTION_REJECTED") {
                errorMessage += "You rejected the transaction.";
            } else if (error.error && error.error.message) {
                errorMessage += error.error.message;
            } else {
                errorMessage +=
                    "An unexpected error occurred. Please try again later.";
            }

            alert(errorMessage);
        }
    }
