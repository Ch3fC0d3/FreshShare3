const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { app, connectDb, initializeDatabase } = require('../../server');

describe('Group schedule API', () => {
  let mongoServer;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    await connectDb();
    await initializeDatabase();
  });

  afterEach(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('creates a group with order and delivery schedules', async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({
        name: 'Schedule Group',
        description: 'Group with schedule fields',
        category: 'neighborhood',
        location: {
          street: '123 Test Ave',
          city: 'Testville',
          state: 'TS',
          zipCode: '12345',
        },
        rules: 'Be kind',
        deliveryDays: ['Monday', 'Wednesday'],
        orderBySchedule: { day: 'Thursday', time: '22:00' },
        deliverySchedule: { day: 'Saturday', time: '10:00' },
      })
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(res.body?.group?.orderBySchedule).toEqual({ day: 'Thursday', time: '22:00' });
    expect(res.body?.group?.deliverySchedule).toEqual({ day: 'Saturday', time: '10:00' });
  });

  it('returns null schedule fields when omitted', async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({
        name: 'No Schedule Group',
        description: 'Group without schedule fields',
        category: 'community_garden',
        location: {
          street: '',
          city: 'Garden City',
          state: 'GC',
          zipCode: '67890',
        },
        rules: '',
        deliveryDays: ['Friday'],
      })
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(201);
    expect(res.body?.group?.orderBySchedule).toEqual({ day: null, time: null });
    expect(res.body?.group?.deliverySchedule).toEqual({ day: null, time: null });
  });

  it('allows fetching the group with persisted schedule fields', async () => {
    const createRes = await request(app)
      .post('/api/groups')
      .send({
        name: 'Fetch Schedule Group',
        description: 'Group to fetch later',
        category: 'food_bank',
        location: {
          street: '789 Fetch Rd',
          city: 'Fetchville',
          state: 'FT',
          zipCode: '55555',
        },
        rules: 'Share resources',
        deliveryDays: ['Tuesday'],
        orderBySchedule: { day: 'Monday', time: '09:30' },
        deliverySchedule: { day: 'Wednesday', time: '15:15' },
      })
      .set('Accept', 'application/json');

    expect(createRes.statusCode).toBe(201);
    const groupId = createRes.body.group._id;

    const fetchRes = await request(app).get(`/api/groups/${groupId}`);
    expect(fetchRes.statusCode).toBe(200);
    expect(fetchRes.body?.group?.orderBySchedule).toEqual({ day: 'Monday', time: '09:30' });
    expect(fetchRes.body?.group?.deliverySchedule).toEqual({ day: 'Wednesday', time: '15:15' });
  });

  it('updates schedule via PUT and persists normalized format', async () => {
    const createRes = await request(app)
      .post('/api/groups')
      .send({
        name: 'Update Schedule Group',
        description: 'Group to update schedule later',
        category: 'other',
        location: {
          street: '12 Update Ln',
          city: 'Updater',
          state: 'UP',
          zipCode: '22222',
        },
        rules: 'Help each other',
        deliveryDays: ['Thursday'],
      })
      .set('Accept', 'application/json');

    expect(createRes.statusCode).toBe(201);
    const groupId = createRes.body.group._id;

    const updateRes = await request(app)
      .put(`/api/groups/${groupId}`)
      .send({
        orderBySchedule: { day: 'Friday', time: '18:45' },
        deliverySchedule: { day: 'Sunday', time: '08:30' },
      })
      .set('Accept', 'application/json');

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body?.group?.orderBySchedule).toEqual({ day: 'Friday', time: '18:45' });
    expect(updateRes.body?.group?.deliverySchedule).toEqual({ day: 'Sunday', time: '08:30' });

    const fetchRes = await request(app).get(`/api/groups/${groupId}`);
    expect(fetchRes.statusCode).toBe(200);
    expect(fetchRes.body?.group?.orderBySchedule).toEqual({ day: 'Friday', time: '18:45' });
    expect(fetchRes.body?.group?.deliverySchedule).toEqual({ day: 'Sunday', time: '08:30' });
  });
});
