const Koa = require("koa");
const Router = require("@koa/router");
const serve = require("koa-static");
const path = require("path");
const axios = require("axios");
const cors = require("@koa/cors");

const app = new Koa();
const router = new Router();

// Use CORS
app.use(cors());

// Serve static files from the 'public' directory
app.use(serve(path.join(__dirname, "public")));

// API route for getting the message
router.get("/api/message", (ctx) => {
  ctx.body = { message: "hello" };
});

router.get('/api/nfts/:address', async (ctx) => {
  const { address } = ctx.params;
  const apiKey = 'Your Alchemy API key'; // Replace with your Alchemy API key
  const baseURL = `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}/getNFTs/`;
  try {
    const response = await axios.get(baseURL, {
      params: {
        owner: address,
        withMetadata: true,
        pageSize: 100 // Adjust as needed
      }
    });
    const nfts = response.data.ownedNfts.map(nft => ({
      contractAddress: nft.contract.address,
      tokenId: nft.id.tokenId,
      title: nft.title,
      description: nft.description,
      imageUrl: nft.metadata.image_url || nft.metadata.image || '',
      collectionName: nft.contract.name || ''
    }));
    ctx.body = nfts;
  } catch (error) {
    console.error('Error fetching NFTs:', error.response ? error.response.data : error.message);
    ctx.status = error.response ? error.response.status : 500;
    ctx.body = { error: 'Failed to fetch NFTs', details: error.response ? error.response.data : error.message };
  }
});
// Use the router
app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
