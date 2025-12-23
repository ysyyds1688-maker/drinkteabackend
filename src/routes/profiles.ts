import { Router } from 'express';
import { profileModel } from '../models/Profile.js';
import { v4 as uuidv4 } from 'uuid';
import { Profile } from '../types.js';

const router = Router();

// GET /api/profiles - Get all profiles
router.get('/', async (req, res) => {
  try {
    const profiles = await profileModel.getAll();
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/profiles/:id - Get profile by ID
router.get('/:id', async (req, res) => {
  try {
    const profile = await profileModel.getById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profiles - Create new profile
router.post('/', async (req, res) => {
  try {
    const profileData: Profile = {
      id: req.body.id || uuidv4(),
      ...req.body,
    };

    // Validate required fields
    if (!profileData.name || !profileData.nationality || !profileData.location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const profile = await profileModel.create(profileData);
    res.status(201).json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/profiles/:id - Update profile
router.put('/:id', async (req, res) => {
  try {
    const profile = await profileModel.update(req.params.id, req.body);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/profiles/:id - Delete profile
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await profileModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
