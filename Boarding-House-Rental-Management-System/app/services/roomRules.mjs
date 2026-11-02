export const MAX_ROOMS_PER_HOUSE = 18;
export const STANDARD_ROOM_TYPE_ID = 'type-double';
export const PREMIUM_ROOM_TYPE_ID = 'type-premium-double';
export const ROOM_LIMIT_ERROR_MESSAGE = 'This boarding house has reached its limit of 18 rooms.';

export function isRoomLimitReached(roomCount) {
  return Number(roomCount) >= MAX_ROOMS_PER_HOUSE;
}

export function getEffectiveRoomTypeId(typeId, hasAirConditioning, hasPrivateBathroom) {
  if (hasAirConditioning && hasPrivateBathroom) {
    return PREMIUM_ROOM_TYPE_ID;
  }
  return typeId;
}

export function getRoomAmenities(typeId, hasAirConditioning, hasPrivateBathroom) {
  const isPremiumRoom = typeId === PREMIUM_ROOM_TYPE_ID;
  return {
    hasAirConditioning: isPremiumRoom || Boolean(hasAirConditioning),
    hasPrivateBathroom: isPremiumRoom || Boolean(hasPrivateBathroom),
  };
}

export function getActiveRoomOccupants(roomId, leases, tenants) {
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const seenTenantIds = new Set();

  return leases
    .filter((lease) => lease.room_id === roomId && lease.status === 'active')
    .flatMap((lease) => {
      if (seenTenantIds.has(lease.tenant_id)) return [];
      seenTenantIds.add(lease.tenant_id);
      const tenant = tenantById.get(lease.tenant_id);
      if (!tenant) return [];

      const name = [tenant.first_name, tenant.last_name].filter(Boolean).join(' ').trim();
      return name ? [name] : [];
    });
}
