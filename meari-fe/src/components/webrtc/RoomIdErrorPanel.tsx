import { useNavigate } from 'react-router-dom'

function RoomIdErrorPanel() {
    const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50">
        <p className="text-red-600 text-lg font-medium">유효하지 않은 방 ID입니다</p>
        <button onClick={() => navigate("/main")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            홈으로 돌아가기
        </button>
    </div>
  )
}

export default RoomIdErrorPanel
