import time
import json
import websocket
import threading
from datetime import datetime, timezone
from gpiozero import MCP3008, DistanceSensor

# ===============================
# 1. 설정 (서버 및 하드웨어)
# ===============================
SERVER_WS = "ws://10.0.20.179:8080"  # ec2 ipv4(배포시)

# 초음파 센서 설정 (GPIO 18, 16)
try:
    ultrasonic = DistanceSensor(echo=18, trigger=16, max_distance=2.0)
except Exception as e:
    print(f"⚠️ 초음파 센서 초기화 실패: {e}")
    ultrasonic = None

# 압력 센서 키 (요청하신 순서대로)
SENSOR_KEYS = [
    "seat_front", "seat_back", "seat_left", "seat_right",
    "back_front", "back_back", "back_left", "back_right"
]

SEAT_THRESHOLD_CM = 20.0

# ===============================
# 2. 데이터 수집 함수들
# ===============================
# 노이즈 제거 기준값 (이 값보다 작으면 0으로 침)
# 1~2가 뜨는 게 거슬리면 10~20 정도로 잡으면 확실합니다.
PRESSURE_THRESHOLD = 20 

def read_pressure_sensors():
    values = {}
    for i in range(8):
        try:
            with MCP3008(channel=i) as adc:
                # 1. 0~1023 범위로 변환
                raw_val = int(adc.value * 1023)
                
                # 2. [보정] 노이즈 제거 (Threshold)
                # 값이 20보다 작으면 -> 안 누른 걸로(0) 처리
                if raw_val < PRESSURE_THRESHOLD:
                    val = 0
                else:
                    val = raw_val # 20 이상이면 실제 값 사용
                
                values[SENSOR_KEYS[i]] = val
        except:
            values[SENSOR_KEYS[i]] = 0
            
    return values

def get_ultrasonic_status():
    dist_cm = -1
    is_seated = False
    if ultrasonic:
        try:
            if ultrasonic.value is not None:
                dist_cm = ultrasonic.distance * 100
                is_seated = dist_cm < SEAT_THRESHOLD_CM
        except:
            pass
    return is_seated

# ===============================
# 3. [핵심] 분리 전송 로직
# ===============================
def run_sensor_loop(ws):
    print("🚀 센서 데이터 전송 루프 시작 (분리 전송 모드)")
    
    while True:
        try:
            # 시간 생성 (ISO 8601 포맷 + Z)
            # 예: 2026-01-05T14:28:33.123Z 형태로 만듦
            now_utc = datetime.now(timezone.utc)
            timestamp_str = now_utc.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

            # --- [데이터 1] 초음파 (착석 여부) ---
            is_seated = get_ultrasonic_status()
            
            packet_1 = {
                "isSeated": is_seated,
                "detectedAt": timestamp_str  # 요청하신 키 이름: detectedAt
            }
            
            # --- [데이터 2] 압력 센서 ---
            pressure_values = read_pressure_sensors()
            
            packet_2 = {
                "sensors": pressure_values,
                "timestamp": timestamp_str   # 요청하신 키 이름: timestamp
            }

            # --- 전송 (따로따로 보냄) ---
            if ws.sock and ws.sock.connected:
                
                # 1번 패킷 전송
                ws.send(json.dumps(packet_1))
                print(f"📤 [초음파] 전송 완료: {packet_1}")
                
                # 아주 잠깐 대기 (서버 과부하 방지, 0.05초)
                time.sleep(0.05) 
                
                # 2번 패킷 전송
                ws.send(json.dumps(packet_2))
                print(f"📤 [압  력] 전송 완료: {packet_2}")
                
            else:
                print("⚠️ 연결 끊김...")
                break

            time.sleep(5) # 5초 간격

        except Exception as e:
            print(f"❌ 데이터 전송 중 에러: {e}")
            break
            
# ===============================
# 4. WebSocket 핸들러
# ===============================
def on_open(ws):
    print("✅ 서버 연결 성공! 데이터 전송을 시작합니다.")
    t = threading.Thread(target=run_sensor_loop, args=(ws,))
    t.daemon = True
    t.start()

def on_error(ws, error):
    print(f"❌ 에러: {error}")

def on_close(ws, close_status_code, close_msg):
    print("🔌 연결 종료")

if __name__ == "__main__":
    ws = websocket.WebSocketApp(
        SERVER_WS,
        on_open=on_open,
        on_error=on_error,
        on_close=on_close
    )
    
    while True:
        try:
            ws.run_forever()
            print("🔄 재연결 시도...")
            time.sleep(3)
        except KeyboardInterrupt:
            print("\n종료")
            break
