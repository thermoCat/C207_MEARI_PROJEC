function LoadingPanel() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600">방 정보를 불러오는 중...</p>
    </div>
  )
}

export default LoadingPanel
