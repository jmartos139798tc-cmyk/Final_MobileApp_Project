import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ROOMS_PER_HOUSE,
  PREMIUM_ROOM_TYPE_ID,
  STANDARD_ROOM_TYPE_ID,
  getEffectiveRoomTypeId,
  getActiveRoomOccupants,
  getRoomAmenities,
  isRoomLimitReached,
} from '../app/services/roomRules.mjs';

test('room limit allows the eighteenth room and blocks any additional room', () => {
  assert.equal(MAX_ROOMS_PER_HOUSE, 18);
  assert.equal(isRoomLimitReached(17), false);
  assert.equal(isRoomLimitReached(18), true);
  assert.equal(isRoomLimitReached(19), true);
});

test('premium rooms always include air conditioning and a private bathroom', () => {
  assert.deepEqual(getRoomAmenities(PREMIUM_ROOM_TYPE_ID, false, false), {
    hasAirConditioning: true,
    hasPrivateBathroom: true,
  });
});

test('a room with both premium amenities is priced as premium', () => {
  assert.equal(
    getEffectiveRoomTypeId(STANDARD_ROOM_TYPE_ID, true, true),
    PREMIUM_ROOM_TYPE_ID,
  );
  assert.equal(
    getEffectiveRoomTypeId(STANDARD_ROOM_TYPE_ID, true, false),
    STANDARD_ROOM_TYPE_ID,
  );
});

test('standard room amenities remain individually configurable', () => {
  assert.deepEqual(getRoomAmenities(STANDARD_ROOM_TYPE_ID, true, false), {
    hasAirConditioning: true,
    hasPrivateBathroom: false,
  });
});

test('active room occupants include every tenant with their full name', () => {
  const tenants = [
    { id: 'tenant-1', first_name: 'Alex', last_name: 'Santos' },
    { id: 'tenant-2', first_name: 'Jamie', last_name: 'Reyes' },
    { id: 'tenant-3', first_name: 'Morgan', last_name: 'Cruz' },
  ];
  const leases = [
    { id: 'lease-1', room_id: 'room-1', tenant_id: 'tenant-1', status: 'active' },
    { id: 'lease-2', room_id: 'room-1', tenant_id: 'tenant-2', status: 'active' },
    { id: 'lease-3', room_id: 'room-1', tenant_id: 'tenant-3', status: 'ended' },
    { id: 'lease-4', room_id: 'room-2', tenant_id: 'tenant-3', status: 'active' },
  ];

  assert.deepEqual(getActiveRoomOccupants('room-1', leases, tenants), [
    'Alex Santos',
    'Jamie Reyes',
  ]);
});
