// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GavelArc — Timed English auction with native USDC
contract GavelArc {
    struct Auction {
        uint256 id;
        address seller;
        string item;
        string description;
        uint256 startPrice;
        uint256 currentBid;
        address highestBidder;
        uint256 endTime;
        bool ended;
        uint256 createdAt;
    }

    Auction[] public auctions;
    mapping(uint256 => mapping(address => uint256)) public pendingRefunds;

    bool private locked;
    modifier noReentrant() { require(!locked); locked = true; _; locked = false; }

    event AuctionCreated(uint256 indexed id, address indexed seller, string item, uint256 startPrice, uint256 endTime);
    event BidPlaced(uint256 indexed id, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed id, address indexed winner, uint256 amount);

    function create(string calldata item, string calldata description, uint256 startPrice, uint256 durationSeconds) external returns (uint256) {
        require(bytes(item).length > 0, "Item required");
        require(durationSeconds >= 300 && durationSeconds <= 7 days, "Duration 5min-7d");
        uint256 id = auctions.length;
        uint256 endTime = block.timestamp + durationSeconds;
        auctions.push(Auction(id, msg.sender, item, description, startPrice, 0, address(0), endTime, false, block.timestamp));
        emit AuctionCreated(id, msg.sender, item, startPrice, endTime);
        return id;
    }

    function bid(uint256 id) external payable noReentrant {
        require(id < auctions.length, "Not found");
        Auction storage a = auctions[id];
        require(!a.ended && block.timestamp < a.endTime, "Auction ended");
        uint256 minBid = a.currentBid == 0 ? a.startPrice : a.currentBid * 105 / 100; // 5% increment
        require(msg.value >= minBid, "Bid too low");
        if (a.highestBidder != address(0)) pendingRefunds[id][a.highestBidder] += a.currentBid;
        a.currentBid = msg.value;
        a.highestBidder = msg.sender;
        // Extend by 5 min if bid in last 5 min
        if (a.endTime - block.timestamp < 5 minutes) a.endTime = block.timestamp + 5 minutes;
        emit BidPlaced(id, msg.sender, msg.value);
    }

    function finalize(uint256 id) external noReentrant {
        require(id < auctions.length, "Not found");
        Auction storage a = auctions[id];
        require(!a.ended, "Already ended");
        require(block.timestamp >= a.endTime, "Not ended yet");
        a.ended = true;
        if (a.highestBidder != address(0)) {
            (bool ok,) = payable(a.seller).call{value: a.currentBid}("");
            require(ok, "Payment failed");
        }
        emit AuctionEnded(id, a.highestBidder, a.currentBid);
    }

    function withdraw(uint256 id) external noReentrant {
        uint256 amount = pendingRefunds[id][msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingRefunds[id][msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");
    }

    function getAll(uint256 count) external view returns (Auction[] memory) {
        uint256 len = auctions.length;
        uint256 n = count > len ? len : count;
        Auction[] memory result = new Auction[](n);
        for (uint256 i = 0; i < n; i++) result[i] = auctions[len - 1 - i];
        return result;
    }

    function total() external view returns (uint256) { return auctions.length; }
    receive() external payable {}
}
