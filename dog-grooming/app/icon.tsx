import { ImageResponse } from 'next/og'
import { PawIcon } from '@/lib/pawIcon'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<PawIcon size={512} />, size)
}
