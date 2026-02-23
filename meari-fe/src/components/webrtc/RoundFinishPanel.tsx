function RoundFinishPanel() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-30 rounded-lg">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white text-xl font-semibold mt-4">
            라운드 종료 처리 중...
        </p>
    </div>
  )
}

export default RoundFinishPanel
