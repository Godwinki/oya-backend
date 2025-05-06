// controllers/settingController.js
const { Setting } = require('../models');

// GET /api/settings - list all settings
exports.getAllSettings = async (req, res) => {
  console.log('📥 [Settings] Request to list all settings received');
  try {
    const section = req.query.section;
    const query = section ? { section } : {};
    const settings = await Setting.findAll(query);
    console.log(`✅ [Settings] Returned ${settings.length} settings`);
    res.json({
      emoji: '📖',
      message: 'All settings fetched successfully',
      settings: settings.map(setting => ({ ...setting.dataValues, section: setting.section }))
    });
  } catch (err) {
    console.log('❌ [Settings] Failed to fetch settings:', err.message);
    res.status(500).json({ emoji: '❌', error: 'Failed to fetch settings', details: err.message });
  }
};

// GET /api/settings/:key - get a setting by key
exports.getSetting = async (req, res) => {
  console.log(`📥 [Settings] Request to get setting: ${req.params.key}`);
  try {
    const setting = await Setting.findOne({ where: { key: req.params.key } });
    if (!setting) {
      console.log(`⚠️ [Settings] Setting not found: ${req.params.key}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Setting not found' });
    }
    console.log(`✅ [Settings] Setting returned: ${req.params.key}`);
    res.json({
      emoji: '🔑',
      message: 'Setting fetched successfully',
      setting
    });
  } catch (err) {
    console.log('❌ [Settings] Failed to fetch setting:', err.message);
    res.status(500).json({ emoji: '❌', error: 'Failed to fetch setting', details: err.message });
  }
};

// PUT /api/settings/:key - update or create a setting
exports.upsertSetting = async (req, res) => {
  console.log(`📝 [Settings] Upsert request for key: ${req.params.key}`);
  try {
    const { value, description } = req.body;
    const [setting, created] = await Setting.upsert({
      key: req.params.key,
      value,
      description,
    }, { returning: true });
    if (created) {
      console.log(`✅ [Settings] Created new setting: ${req.params.key}`);
      res.json({ emoji: '✨', message: 'Setting created successfully', setting });
    } else {
      console.log(`✅ [Settings] Updated setting: ${req.params.key}`);
      res.json({ emoji: '✏️', message: 'Setting updated successfully', setting });
    }
  } catch (err) {
    console.log('❌ [Settings] Failed to upsert setting:', err.message);
    res.status(500).json({ emoji: '❌', error: 'Failed to upsert setting', details: err.message });
  }
};

// DELETE /api/settings/:key - delete a setting
exports.deleteSetting = async (req, res) => {
  console.log(`🗑️ [Settings] Delete request for key: ${req.params.key}`);
  try {
    const result = await Setting.destroy({ where: { key: req.params.key } });
    if (result === 0) {
      console.log(`⚠️ [Settings] Setting not found for delete: ${req.params.key}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Setting not found' });
    }
    console.log(`✅ [Settings] Deleted setting: ${req.params.key}`);
    res.json({ emoji: '🗑️', message: 'Setting deleted' });
  } catch (err) {
    console.log('❌ [Settings] Failed to delete setting:', err.message);
    res.status(500).json({ emoji: '❌', error: 'Failed to delete setting', details: err.message });
  }
};
