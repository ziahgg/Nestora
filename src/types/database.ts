/**
 * Database types. `database.generated.ts` is produced from the local schema by `npm run db:types`
 * (supabase gen types); this file only adds short row aliases used across the app.
 */
import type { Database, Enums, Tables } from './database.generated';

export type { Database };

export type ProfileRow = Tables<'profiles'>;
export type PropertyRow = Tables<'properties'>;
export type PropertyImageRow = Tables<'property_images'>;
export type AmenityRow = Tables<'amenities'>;
export type NeighborhoodRow = Tables<'neighborhoods'>;
export type InquiryRow = Tables<'inquiries'>;
export type InquiryEventRow = Tables<'inquiry_events'>;
export type ViewingRow = Tables<'viewings'>;
export type NotificationRow = Tables<'notifications'>;
export type RecentSearchRow = Tables<'recent_searches'>;
/** agents.user_id is not readable by the browser roles, so it's left out. */
export type AgentRow = Omit<Tables<'agents'>, 'user_id'>;

export type PropertyType = Enums<'property_type'>;
export type ListingStatus = Enums<'listing_status'>;
export type Furnishing = Enums<'furnishing'>;
export type PetsPolicy = Enums<'pets_policy'>;
export type ContactMethod = Enums<'contact_method'>;
export type InquiryStatus = Enums<'inquiry_status'>;
export type ViewingType = Enums<'viewing_type'>;
export type ViewingStatus = Enums<'viewing_status'>;
export type NotificationKind = Enums<'notification_kind'>;
