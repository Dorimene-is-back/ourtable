import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ctamabtmvsjssugqubhc.supabase.co'
const supabaseKey = 'sb_publishable_2twG74B6We1RNHZ-GN1HuA_PZc_XlKO'

export const supabase = createClient(supabaseUrl, supabaseKey)
