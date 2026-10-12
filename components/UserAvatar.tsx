type Props = {
  name?: string | null
  photoUrl?: string | null
  size?: number
}

export default function UserAvatar({ name, photoUrl, size = 36 }: Props) {
  const style = { width: size, height: size }

  return photoUrl ? (
    <img
      src={photoUrl}
      alt={name ?? 'প্রোফাইল'}
      style={style}
      className="rounded-full object-cover"
    />
  ) : (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-blue-700 font-bold text-white"
    >
      {name?.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}