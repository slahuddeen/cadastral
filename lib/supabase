import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for our cadastral data
export interface CadastralParcel {
  id: number;
  parcel_id: string;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  area_sqm: number;
  owner_name?: string;
  land_use?: string;
  registration_date?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Database functions
export const cadastralService = {
  // Get all parcels within a bounding box
  async getParcelsInBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) {
    const { data, error } = await supabase
      .from('cadastral_parcels')
      .select('*')
      .rpc('parcels_in_bounds', {
        min_lng: bounds.west,
        min_lat: bounds.south,
        max_lng: bounds.east,
        max_lat: bounds.north
      });

    if (error) throw error;
    return data as CadastralParcel[];
  },

  // Get parcel by ID
  async getParcelById(parcelId: string) {
    const { data, error } = await supabase
      .from('cadastral_parcels')
      .select('*')
      .eq('parcel_id', parcelId)
      .single();

    if (error) throw error;
    return data as CadastralParcel;
  },

  // Search parcels by owner name
  async searchParcelsByOwner(ownerName: string) {
    const { data, error } = await supabase
      .from('cadastral_parcels')
      .select('*')
      .ilike('owner_name', `%${ownerName}%`);

    if (error) throw error;
    return data as CadastralParcel[];
  },

  // Get all parcels (with pagination)
  async getAllParcels(page = 0, limit = 100) {
    const { data, error } = await supabase
      .from('cadastral_parcels')
      .select('*')
      .range(page * limit, (page + 1) * limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CadastralParcel[];
  }
};
