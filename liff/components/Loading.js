export default function Loading() {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-line-green"></div>
      <p className="mt-4 text-gray-600 font-medium">กำลังโหลด...</p>
    </div>
  )
}
