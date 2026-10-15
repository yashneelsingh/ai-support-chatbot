import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { upload } from '../services/cloudinary.js';
import { ingestDocument } from '../rag/ingest.js';
import mongoose from 'mongoose';

const router = Router();

// POST /api/ingest — upload a PDF/TXT and embed it (admin only)
router.post('/', protect, adminOnly, upload.single('document'), async (req, res, next) => {
  if (!req.file)
    return res.status(400).json({ message: 'No file uploaded' });

  try {
    const chunksAdded = await ingestDocument(req.file.path, req.file.originalname);
    res.json({
      message:     'Document ingested successfully',
      chunksAdded,
      file:        req.file.originalname,
    });
  } catch (err) {
    console.error('Ingestion error:', err);
    next(err);
  }
});

// GET /api/ingest/docs — list all ingested document names
router.get('/docs', protect, adminOnly, async (req, res, next) => {
  try {
    const docs = await mongoose.connection
      .collection('doc_vectors')
      .distinct('metadata.source');
    res.json({ docs, count: docs.length });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/ingest/docs/:name — remove all vectors for a document
router.delete('/docs/:name', protect, adminOnly, async (req, res, next) => {
  if (!req.params.name || typeof req.params.name !== 'string')
    return res.status(400).json({ message: 'Invalid document name' });
  try {
    const result = await mongoose.connection
      .collection('doc_vectors')
      .deleteMany({ 'metadata.source': req.params.name });
    res.json({ message: `Deleted "${req.params.name}"`, chunksRemoved: result.deletedCount });
  } catch (err) {
    next(err);
  }
});

export default router;
