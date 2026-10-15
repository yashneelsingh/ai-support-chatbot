import 'dotenv/config';
import { connectMongo } from './services/mongo.js';
import { getVectorStore } from './rag/vectorStore.js';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import crypto from 'crypto';

const dummyData = [
  {
    fileName: 'policies.pdf',
    text: `Return and Refund Policy:
We offer a 30-day return window for all clothing, electronics, and home goods. Items must be in original condition. Open-box electronics are subject to a 15% restocking fee unless defective. Refunds are issued to the original payment method within 5-7 business days of receiving the return. Store credit is available immediately. Price matching is offered within 14 days of purchase. Only one promo code can be used per order. We accept PayPal, Visa, and Mastercard. Custom or personalized items are NOT eligible for return.`
  },
  {
    fileName: 'shipping_faq.pdf',
    text: `Shipping FAQ:
We offer international shipping to Europe, Canada, and Australia. Ground shipping typically takes 3-5 business days. Expedited shipping takes 1-2 business days but is NOT available for P.O. boxes. If a package is lost in transit, contact support after 7 days from the expected delivery date for a replacement. We use UPS and FedEx for domestic shipments. Tracking numbers are provided via email once the order ships.`
  },
  {
    fileName: 'product_specs.pdf',
    text: `Product Specifications:
- Wireless Mouse: Compatible with Windows, Mac, and Linux. Battery lasts 40 hours.
- Mechanical Keyboard RGB: Uses Cherry MX Red key switch type.
- 27 inch 4K IPS Monitor: Supports VESA mounting (100x100mm).
- USB-C Fast Charger: Outputs 65W, compatible with phones and laptops.
- Earbuds: Noise cancellation level up to 35 decibels.
- Insulated Hiking Backpack 40L: IPX4 waterproof rating.
- Vitamin C Brightening Serum Ingredients: Water, Vitamin C (15%), Hyaluronic Acid, Ferulic Acid.
- Winter Jacket: Material is 100% polyester with synthetic down insulation.
- Running Shoes: True to size. We recommend ordering your normal size.`
  }
];

async function ingest() {
  try {
    await connectMongo();
    const vectorStore = getVectorStore();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    let totalChunks = 0;

    for (const doc of dummyData) {
      console.log(`Processing ${doc.fileName}...`);
      const chunks = await splitter.createDocuments(
        [doc.text],
        [{ source: doc.fileName }]
      );

      for (const chunk of chunks) {
        chunk.metadata.chunkId = crypto
          .createHash('sha256')
          .update(chunk.pageContent)
          .digest('hex')
          .slice(0, 16);
      }

      await vectorStore.addDocuments(chunks);
      console.log(`Ingested ${chunks.length} chunks from ${doc.fileName}`);
      totalChunks += chunks.length;
    }

    console.log(`\n✅ Successfully ingested ${totalChunks} chunks in total.`);
    process.exit(0);
  } catch (err) {
    console.error('Ingestion failed:', err);
    process.exit(1);
  }
}

ingest();
