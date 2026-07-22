import client from './client'

export interface ConsultantProfileData {
  id: number | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  graduation_year: number | null
  serie: string | null
  linkedin_url: string | null
  career_path: string | null
  current_situation: string | null
  why_this_career: string | null
  profile_picture_path: string | null
  profile_picture_url: string | null
  consent_poster: boolean
  consent_alumni_data: boolean
}

export interface ConsultantProfileResponse {
  name: string
  email: string | null
  profile: ConsultantProfileData | null
}

export async function fetchConsultantProfile(): Promise<ConsultantProfileResponse> {
  const { data } = await client.get('/consultant/profile')
  return data
}

export async function updateConsultantProfile(
  fields: Partial<Omit<ConsultantProfileData, 'id' | 'profile_picture_path' | 'profile_picture_url'>>,
  photo?: File,
): Promise<ConsultantProfileData> {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) {
      // FormData can't send booleans; convert to '1'/'0' for Laravel's boolean cast
      form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
    }
  }
  if (photo) form.append('profile_picture', photo)
  const { data } = await client.post('/consultant/profile', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
