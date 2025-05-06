// smsProviderController.js
const axios = require('axios');
const { Op } = require('sequelize');
const { 
  SMSProvider, 
  SMSMessage,
  sequelize
} = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Get all SMS providers
 */
const getAllProviders = catchAsync(async (req, res) => {
  const providers = await SMSProvider.findAll({
    order: [['isActive', 'DESC'], ['name', 'ASC']]
  });

  res.status(200).json({
    status: 'success',
    data: providers
  });
});

/**
 * Get active SMS provider
 */
const getActiveProvider = catchAsync(async (req, res) => {
  const provider = await SMSProvider.findOne({
    where: { isActive: true }
  });

  if (!provider) {
    throw new ApiError(404, 'No active SMS provider found');
  }

  res.status(200).json({
    status: 'success',
    data: provider
  });
});

/**
 * Get SMS provider by ID
 */
const getProviderById = catchAsync(async (req, res) => {
  const provider = await SMSProvider.findByPk(req.params.id);

  if (!provider) {
    throw new ApiError(404, 'SMS provider not found');
  }

  res.status(200).json({
    status: 'success',
    data: provider
  });
});

/**
 * Create a new SMS provider
 */
const createProvider = catchAsync(async (req, res) => {
  const { 
    name, 
    apiKey, 
    apiSecret, 
    senderId, 
    baseUrl, 
    costPerSMS,
    isActive,
    features
  } = req.body;

  if (!name) {
    throw new ApiError(400, 'Provider name is required');
  }

  // If this provider is active, deactivate all others
  if (isActive) {
    await SMSProvider.update(
      { isActive: false },
      { where: { isActive: true } }
    );
  }

  const provider = await SMSProvider.create({
    name,
    apiKey,
    apiSecret,
    senderId,
    baseUrl,
    costPerSMS: costPerSMS || 0,
    isActive: isActive || false,
    features: features || []
  });

  res.status(201).json({
    status: 'success',
    data: provider
  });
});

/**
 * Update an SMS provider
 */
const updateProvider = catchAsync(async (req, res) => {
  const { 
    name, 
    apiKey, 
    apiSecret, 
    senderId, 
    baseUrl, 
    costPerSMS,
    isActive,
    features
  } = req.body;

  const provider = await SMSProvider.findByPk(req.params.id);

  if (!provider) {
    throw new ApiError(404, 'SMS provider not found');
  }

  // If setting this provider to active, deactivate all others
  if (isActive && !provider.isActive) {
    await SMSProvider.update(
      { isActive: false },
      { where: { id: { [Op.ne]: provider.id }, isActive: true } }
    );
  }

  if (name) provider.name = name;
  if (apiKey !== undefined) provider.apiKey = apiKey;
  if (apiSecret !== undefined) provider.apiSecret = apiSecret;
  if (senderId !== undefined) provider.senderId = senderId;
  if (baseUrl !== undefined) provider.baseUrl = baseUrl;
  if (costPerSMS !== undefined) provider.costPerSMS = costPerSMS;
  if (isActive !== undefined) provider.isActive = isActive;
  if (features !== undefined) provider.features = features;

  await provider.save();

  res.status(200).json({
    status: 'success',
    data: provider
  });
});

/**
 * Delete an SMS provider
 */
const deleteProvider = catchAsync(async (req, res) => {
  const provider = await SMSProvider.findByPk(req.params.id);

  if (!provider) {
    throw new ApiError(404, 'SMS provider not found');
  }

  // If this is the active provider, don't allow deletion
  if (provider.isActive) {
    throw new ApiError(400, 'Cannot delete the active provider. Set another provider as active first.');
  }

  await provider.destroy();

  res.status(204).send();
});

/**
 * Set a provider as active
 */
const setActiveProvider = catchAsync(async (req, res) => {
  const provider = await SMSProvider.findByPk(req.params.id);

  if (!provider) {
    throw new ApiError(404, 'SMS provider not found');
  }

  // Deactivate all providers
  await SMSProvider.update(
    { isActive: false },
    { where: { isActive: true } }
  );

  // Set this provider as active
  provider.isActive = true;
  await provider.save();

  res.status(200).json({
    status: 'success',
    data: provider
  });
});

/**
 * Get SMS balance for a provider
 */
const getProviderBalance = catchAsync(async (req, res) => {
  const { providerId } = req.params;
  const provider = await SMSProvider.findByPk(providerId);

  if (!provider) {
    throw new ApiError(404, 'SMS provider not found');
  }

  // For demonstration, we'll just use the stored balance
  // In a real implementation, you would call the provider's API to get the balance
  
  // Update lastBalanceCheck
  provider.lastBalanceCheck = new Date();
  await provider.save();

  res.status(200).json({
    status: 'success',
    data: {
      providerId: provider.id,
      balance: provider.balance,
      currency: provider.currency,
      lastUpdated: provider.lastBalanceCheck
    }
  });
});

/**
 * Top up SMS balance
 */
const topUpSMSBalance = catchAsync(async (req, res) => {
  const { providerId, amount, currency = 'TSH', paymentMethod } = req.body;

  if (!providerId || !amount || !paymentMethod) {
    throw new ApiError(400, 'Provider ID, amount, and payment method are required');
  }

  const provider = await SMSProvider.findByPk(providerId);
  if (!provider) {
    throw new ApiError(404, 'SMS provider not found');
  }

  // Integration with payment gateway (e.g., PesaPal for Tanzania)
  // This is a simplified example - you'd need to implement the actual API calls
  
  const transactionId = `TOP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  
  // For demonstration, we'll simulate a successful payment
  // In production, you would redirect the user to the payment gateway
  
  // Example payment URL that would be returned by the payment gateway
  const paymentUrl = `https://example.com/pay?tx=${transactionId}&amount=${amount}&currency=${currency}`;
  
  // For now, just update the balance directly (in production, this would happen after payment confirmation)
  provider.balance = parseFloat(provider.balance) + parseFloat(amount);
  await provider.save();

  res.status(200).json({
    status: 'success',
    data: {
      transactionId,
      paymentUrl,
      status: 'PENDING',
      message: 'Please complete payment at the provided URL'
    }
  });
});

/**
 * Verify SMS payment
 */
const verifyPayment = catchAsync(async (req, res) => {
  const { transactionId } = req.params;
  
  // In production, you would check with the payment gateway if the payment was successful
  // For demonstration, we'll just return a success response
  
  res.status(200).json({
    status: 'success',
    data: {
      transactionId,
      status: 'COMPLETED',
      message: 'Payment was successful'
    }
  });
});

module.exports = {
  getAllProviders,
  getActiveProvider,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  setActiveProvider,
  getProviderBalance,
  topUpSMSBalance,
  verifyPayment
};
