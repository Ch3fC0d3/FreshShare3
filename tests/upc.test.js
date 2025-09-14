/* UPC endpoint tests using supertest + jest */
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../server');
const usdaApi = require('../utils/usdaApi');

describe('GET /api/marketplace/upc/:upc', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('returns normalized data when USDA returns branded product (nested product)', async () => {
    jest.spyOn(usdaApi, 'getProductByUpc').mockResolvedValue({
      success: true,
      data: {
        product: {
          description: 'Branded Granola',
          brandName: 'FreshShare Foods',
          ingredients: 'Oats, Honey, Almonds',
          upc: '012345678905',
          nutrients: []
        }
      }
    });

    const res = await request(app).get('/api/marketplace/upc/012345678905');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toMatchObject({
      description: 'Branded Granola',
      brandName: 'FreshShare Foods',
      ingredients: 'Oats, Honey, Almonds',
      upc: '012345678905'
    });
  });

  test('returns normalized generic fallback when USDA returns no match', async () => {
    jest.spyOn(usdaApi, 'getProductByUpc').mockResolvedValue({
      success: true,
      message: 'Generic product information created',
      data: {
        description: 'Product (UPC: 41175811)',
        brandName: 'Unknown Brand',
        ingredients: 'No ingredients information available',
        upc: '41175811',
        isGenericFallback: true
      },
      isMockData: false
    });

    const res = await request(app).get('/api/marketplace/upc/41175811');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toMatchObject({
      upc: '41175811',
      isGenericFallback: true
    });
    expect(typeof res.body.data.description).toBe('string');
    expect(res.body.data.description.length).toBeGreaterThan(0);
  });

  test('rejects invalid UPC format (non-digits) with 400', async () => {
    const res = await request(app).get('/api/marketplace/upc/abc123');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });
});
