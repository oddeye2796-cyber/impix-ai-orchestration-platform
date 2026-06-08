import { MenuItem, CoordinationEvent, Goal, Playbook } from './types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 0,
    category: '시스템 개요',
    name: '통합 대시보드',
    description: '공장 전체 가동 현황 및 주요 KPI 요약',
    roles: ['전체'],
    details: {
      scenario: '공장 전체의 OEE, 불량률, 에너지 소비량을 한눈에 파악',
      logic: '모든 에이전트의 데이터를 통합하여 실시간 KPI 산출',
      target: '공장 전체 가동 효율 85% 이상 유지',
      output: '종합 KPI 카드 및 실시간 모니터링 차트'
    }
  },
  // 품질 관리
  { 
    id: 1, 
    category: 'AI 품질 에이전트', 
    name: '실시간 불량률 현황', 
    description: '라인별/설비별 불량률 실시간 게이지 + 추세', 
    agent: 'Quality Agent', 
    roles: ['오퍼레이터'],
    details: {
      scenario: '실시간 센서 데이터 스트림 분석을 통한 라인별 공정 이상 징후 감지 및 품질 저하 예방',
      logic: 'Kafka 기반 실시간 데이터 파이프라인 -> 온톨로지 기반 Heuristic 규칙 평가 -> Quality Agent 추론 엔진 실행',
      target: '공정 불량률(Defect Rate) 임계치 관리 (Warning: 5%, Critical: 8%) 및 자동 제어 권고',
      output: '실시간 품질 KPI 대시보드 및 지능형 공정 최적화 추천 가이드'
    }
  },
  { 
    id: 2, 
    category: 'AI 품질 에이전트', 
    name: '비전검사 결과 뷰어', 
    description: 'Anomalib/YOLOv8 검사 이미지 + 판정 결과', 
    agent: 'Quality Agent', 
    roles: ['품질관리자'],
    details: {
      scenario: '고해상도 카메라 프레임 분석을 통한 제품 외관 결함 및 라벨 부착 정밀 검사',
      logic: 'RTSP 비디오 스트림 캡처 -> Anomalib(PatchCore) 비지도 학습 추론 -> YOLOv8 객체 탐지 기반 라벨 검증',
      target: '결함 탐지 점수(Defect Score) 0.5 미만 유지 및 미검출/오검출율 2% 이내 관리',
      output: '검사 이미지 오버레이 시각화 및 실시간 결함 판정 리포트'
    }
  },
  { 
    id: 3, 
    category: 'AI 품질 에이전트', 
    name: '불량 유형 분석', 
    description: '파레토 차트, 불량 유형별 빈도/추세 분석', 
    agent: 'Quality Agent', 
    roles: ['품질관리자'],
    details: {
      scenario: '다차원 품질 데이터 분석을 통한 주요 불량 원인(Root Cause) 식별 및 개선 우선순위 도출',
      logic: '자연어 질의 -> Text-to-SQL 변환 엔진 -> TimescaleDB 시계열 쿼리 실행 -> 통계적 유의성 검정 및 시각화',
      target: '불량 유형별(찢김, 기포, 변색 등) 발생 빈도 Pareto 분석을 통한 집중 관리 항목 도출',
      output: '불량 유형별 분포 차트 및 AI 기반 원인 분석 인사이트 리포트'
    }
  },
  { 
    id: 4, 
    category: 'AI 품질 에이전트', 
    name: '온도-불량 상관분석', 
    description: '온도 파라미터 vs 불량률 산점도 + 최적구간', 
    agent: 'Quality Agent', 
    roles: ['설비엔지니어'],
    details: {
      scenario: '공정 파라미터(온도)와 품질 지표 간의 상관관계 분석을 통한 최적 운전 조건(Golden Batch) 도출',
      logic: '다변량 상관분석(Multivariate Correlation) -> 최적 가동 범위(Optimal Range) 산출 -> 산점도 및 회귀 분석',
      target: '온도 설정값(165~180°C) 최적화 및 온톨로지 정의 최적 가동 구간(Measures) 준수율 관리',
      output: '상관관계 산점도 및 AI 추천 최적 공정 파라미터 가이드'
    }
  },
  { 
    id: 5, 
    category: 'AI 품질 에이전트', 
    name: '품질 이력 검색', 
    description: '기간/배치/설비별 품질검사 이력 조회', 
    roles: ['품질관리자'],
    details: {
      scenario: '배치(Batch) 단위 생산 이력 추적성(Traceability) 확보 및 과거 품질 데이터 정밀 조회',
      logic: '시계열 데이터 인덱싱 기반 고속 검색 -> 온톨로지 엔티티 매핑 -> 데이터 무결성 검증 및 리스트 렌더링',
      target: '데이터 조회 지연 시간 1초 이내 유지 및 SQL 화이트리스트 기반 보안 쿼리 실행',
      output: '상세 품질 이력 그리드 및 배치별 생산 품질 리포트'
    }
  },
  
  // 설비 보전
  { 
    id: 6, 
    category: 'AI 설비예지보전 에이전트', 
    name: '설비 상태 종합', 
    description: '전체 설비 정상/경고/위험 현황 맵', 
    agent: 'PM Agent', 
    roles: ['오퍼레이터'],
    details: {
      scenario: '디지털 트윈 기반 공장 전체 설비 가동 상태 실시간 모니터링 및 이상 징후 즉각 식별',
      logic: 'Redis In-memory 데이터 동기화 -> 설비별 3축(진동, 온도, 전류) 상태 평가 -> WebSocket 기반 실시간 상태 전파',
      target: '설비 가동 중단 시간(Downtime) 최소화 및 주요 설비 가동률(Availability) 95% 이상 유지',
      output: '3D 공장 레이아웃 맵 및 설비별 상태 인디케이터'
    }
  },
  { 
    id: 7, 
    category: 'AI 설비예지보전 에이전트', 
    name: '진동/온도 추세', 
    description: '시계열 차트 + 임계치 표시', 
    agent: 'PM Agent', 
    roles: ['설비엔지니어'],
    details: {
      scenario: '설비별 진동(Vibration) 및 온도(Temperature) 시계열 데이터 분석을 통한 기계적 마모 및 과열 징후 정밀 모니터링',
      logic: 'TimescaleDB 시계열 쿼리 최적화 -> 온톨로지 정의 임계치(Warning/Danger) 동적 로드 -> 다중 축 추세 시각화 및 이상 구간 하이라이트',
      target: '진동(3.5~5.0 mm/s) 및 온도(80°C 이상) 임계치 준수 여부 실시간 검증 및 시각적 가이드 제공',
      output: '다중 파라미터 시계열 추세 분석 차트 및 임계치 위반 이력 리포트'
    }
  },
  { 
    id: 8, 
    category: 'AI 설비예지보전 에이전트', 
    name: 'RUL 잔여수명 예측', 
    description: 'GBR 모델 기반 72h 예측 + 보전 권장 시점', 
    agent: 'PM Agent', 
    roles: ['설비엔지니어'],
    details: {
      scenario: '머신러닝 기반 잔여 수명(Remaining Useful Life) 예측을 통한 예방 정비(PdM) 스케줄링 최적화',
      logic: 'BentoML 서빙 엔진 호출 -> Gradient Boosting Regressor 모델 추론 -> RUL 확률 분포 산출 및 보전 권장 윈도우(Window) 도출',
      target: '예측 오차(MAE) 5% 이내 유지 및 RUL 72시간 미만 도달 시 자동 보전 워크오더(Work Order) 트리거',
      output: 'RUL 예측 곡선 시각화 및 AI 기반 최적 보전 시점 추천 가이드'
    }
  },
  { 
    id: 9, 
    category: 'AI 설비예지보전 에이전트', 
    name: '보전 작업 오더', 
    description: 'AI 추천 -> 작업 오더 생성/배정/완료 워크플로우', 
    agent: 'PM Agent', 
    roles: ['설비엔지니어'],
    details: {
      scenario: 'AI 분석 기반 예방 보전 추천 항목의 워크플로우 관리 및 작업 이력 디지털화',
      logic: 'PM Agent 추천 엔진 -> Human-in-the-loop(HITL) 승인 프로세스 -> ERP/MES 연동 작업 오더 생성 및 담당자 자동 배정',
      target: '보전 작업 리드타임(Lead Time) 단축 및 AI 추천 승인율(Acceptance Rate) 90% 이상 확보',
      output: '지능형 보전 작업 관리 칸반 보드 및 작업 이력 추적 그리드'
    }
  },
  { 
    id: 10, 
    category: 'AI 설비예지보전 에이전트', 
    name: '보전 이력 조회', 
    description: '설비별 보전 이력, MTBF/MTTR 통계', 
    roles: ['공장장'],
    details: {
      scenario: '설비 신뢰성 지표(MTBF, MTTR) 분석을 통한 장기 보전 전략 수립 및 설비 자산 관리 최적화',
      logic: '설비 온톨로지 계층 구조(Hierarchy) 기반 데이터 집계 -> 보전 이력 텍스트 마이닝 -> 주요 신뢰성 KPI 산출 엔진 실행',
      target: '평균 고장 간격(MTBF) 연간 15% 향상 및 평균 수리 시간(MTTR) 2시간 이내 관리 목표 수립',
      output: '설비 신뢰성 분석 대시보드 및 상세 보전 이력 리포트'
    }
  },

  // 생산 모니터링
  { 
    id: 11, 
    category: 'AI 생산 최적화 에이전트', 
    name: '라인별 가동 현황', 
    description: '가동/비가동/대기 상태 실시간 표시', 
    agent: 'Line Monitor Agent', 
    roles: ['오퍼레이터'],
    details: {
      scenario: '생산 라인별 가동 상태(Running/Idle/Down) 실시간 가시화 및 병목 구간(Bottleneck) 즉각 식별',
      logic: 'Kafka 실시간 센서 스트림 분석 -> 온톨로지 기반 가동 판정 로직(Heuristics) 적용 -> WebSocket 기반 실시간 상태 맵 업데이트',
      target: '비가동 시간(Downtime) 실시간 감지 및 라인 가동률(Availability) 95% 이상 상시 유지',
      output: '실시간 라인 토폴로지 맵 및 설비별 가동 상태 인디케이터'
    }
  },
  { 
    id: 12, 
    category: 'AI 생산 최적화 에이전트', 
    name: 'OEE 대시보드', 
    description: '가용률 x 성능 x 양품률 자동 산출', 
    agent: 'Line Monitor Agent', 
    roles: ['공장장'],
    details: {
      scenario: '설비 종합 효율(Overall Equipment Effectiveness) 분석을 통한 생산성 손실 요인 정밀 진단',
      logic: '가용성(Availability), 성능(Performance), 품질(Quality) 3대 지표 실시간 집계 -> OEE 종합 지수 산출 및 손실 원인 분류',
      target: '세계 수준(World Class) OEE 지표 85% 달성 목표 관리 및 성능 손실(Minor Stoppages) 최소화',
      output: 'OEE 종합 분석 대시보드 및 6대 손실(Six Big Losses) 분석 리포트'
    }
  },
  { 
    id: 13, 
    category: 'AI 생산 최적화 에이전트', 
    name: '택트타임 분석', 
    description: '설비별 사이클 타임 편차 + 병목 공정 탐지', 
    agent: 'Line Monitor Agent', 
    roles: ['오퍼레이터'],
    details: {
      scenario: '공정별 택트타임(Tact Time) 편차 분석을 통한 생산 밸런싱(Line Balancing) 최적화',
      logic: '생산 로그 기반 사이클 타임 정밀 측정 -> 온톨로지 표준 택트타임 대비 편차 분석 -> 병목 공정 자동 탐지 알고리즘 실행',
      target: '표준 택트타임 준수율 98% 확보 및 공정 간 편차(Variation) 10% 이내 관리',
      output: '공정별 택트타임 히트맵 및 라인 밸런싱 분석 리포트'
    }
  },
  { 
    id: 14, 
    category: 'AI 생산 최적화 에이전트', 
    name: '배치별 생산 이력', 
    description: 'batch_id 기준 역추적', 
    roles: ['품질관리자'],
    details: {
      scenario: '제품 배치(Batch) 단위의 전 공정 데이터 통합 추적(End-to-End Traceability) 및 품질 보증',
      logic: 'Batch ID 기반 다차원 데이터 조인(Join) -> 원자재-공정-품질-물류 통합 타임라인 구성 -> 데이터 무결성 검증',
      target: '품질 이슈 발생 시 원인 공정 역추적 시간 5분 이내 단축 및 배치별 생산 무결성 확보',
      output: '배치별 통합 생산 타임라인 및 품질 추적성 리포트'
    }
  },
  { 
    id: 15, 
    category: 'AI 생산 최적화 에이전트', 
    name: '생산 계획 대비 실적', 
    description: '계획 수량 vs 실적 수량 갭 분석', 
    agent: 'Logistics Agent', 
    roles: ['공장장'],
    details: {
      scenario: '생산 계획 대비 실시간 실적 분석을 통한 납기 준수율 관리 및 생산 목표 달성 가시화',
      logic: 'ERP 생산 계획 데이터 연동 -> 실시간 생산 실적 집계 -> 목표 대비 달성률(Achievement Rate) 및 예상 완료 시간(ETA) 산출',
      target: '일일 생산 계획 달성률 100% 유지 및 계획 대비 편차 발생 시 즉각적인 원인 분석 및 조치 권고',
      output: '생산 목표 달성 현황 대시보드 및 미달 원인 분석 인사이트'
    }
  },

  // 에너지 관리
  { 
    id: 16, 
    category: 'AI 에너지 에이전트', 
    name: '전력 사용 현황', 
    description: '설비별 실시간 전력 소비량 모니터링', 
    agent: 'Energy Agent', 
    roles: ['오퍼레이터'],
    details: {
      scenario: '설비별 실시간 에너지 소비 패턴 분석을 통한 비효율 전력 소모 감지 및 에너지 비용 절감',
      logic: 'IoT 전력 센서 데이터 스트리밍 -> 온톨로지 기반 정격 전력 대비 부하율 산출 -> 에너지 소비 이상 징후 탐지 엔진 실행',
      target: '대기 전력(Standby Power) 최소화 및 정격 부하 120% 초과 시 에너지 과부하 경고 알림',
      output: '실시간 에너지 소비 현황판 및 설비별 부하율 분석 차트'
    }
  },
  { 
    id: 17, 
    category: 'AI 에너지 에이전트', 
    name: '에너지 비용 분석', 
    description: '시간대별 전력 단가 적용 비용 산출', 
    agent: 'Energy Agent', 
    roles: ['공장장'],
    details: {
      scenario: '시간대별 변동 요금제 기반 에너지 비용 분석 및 최적 가동 시간대 추천을 통한 원가 절감',
      logic: '에너지 소비 데이터 + 시간대별 요금(Tariff) 매핑 -> 전력 원가 산출 -> Energy Agent 기반 비용 최적화 시뮬레이션',
      target: '에너지 원가 비중 분석 및 피크 시간대 부하 이동(Load Shifting)을 통한 연간 비용 10% 절감 목표',
      output: '에너지 비용 분석 리포트 및 AI 기반 비용 최적화 권고안'
    }
  },
  { 
    id: 18, 
    category: 'AI 에너지 에이전트', 
    name: '피크 부하 관리', 
    description: '피크 시간대 부하 분산 추천 + 자동 제어 연동', 
    agent: 'Energy Agent', 
    roles: ['설비엔지니어'],
    details: {
      scenario: '최대 수요 전력(Peak Demand) 관리 및 계약 전력 초과 방지를 위한 지능형 부하 제어',
      logic: '실시간 총 전력 수요 예측 -> 피크 임계치 도달 전 경고 트리거 -> 비필수 설비 순차적 부하 차단(Load Shedding) 알고리즘 실행',
      target: '계약 전력 대비 피크 부하 90% 이내 관리 및 피크 시간대 자동 부하 제어 성공률 100% 확보',
      output: '피크 부하 관리 인터페이스 및 자동 제어 실행 이력 로그'
    }
  },

  // 안전 관리
  { 
    id: 19, 
    category: 'AI 안전 에이전트', 
    name: '지능형 CCTV 화재 감시', 
    description: 'AI 비전 기반 화재/연기 실시간 감지 및 경보', 
    agent: 'Safety Agent', 
    roles: ['전체'],
    details: {
      scenario: '공장 내 설치된 지능형 CCTV를 통해 화재 및 연기를 실시간으로 감지하여 대형 사고 예방',
      logic: 'CCTV 비디오 스트림 분석 -> YOLOv8 기반 화재/연기 탐지 -> Safety Agent 위험 등급 판정 및 즉각 알림',
      target: '화재 감지 정확도 99% 이상 및 감지 후 알림 전파 시간 2초 이내 유지',
      output: '실시간 CCTV 화재 감시 뷰 및 위험 구역 하이라이트'
    }
  },
  { 
    id: 20, 
    category: 'AI 안전 에이전트', 
    name: 'AMR 충돌 방지 시스템', 
    description: 'AMR-작업자 근접 감지 및 자동 긴급 정지', 
    agent: 'Safety Agent', 
    roles: ['오퍼레이터'],
    details: {
      scenario: '자율 주행 로봇(AMR)과 작업자 간의 거리를 실시간으로 계산하여 충돌 위험 시 자동 정지',
      logic: 'LiDAR/UWB 센서 데이터 융합 -> 작업자 위치 추적 -> 충돌 위험 반경 진입 시 긴급 정지 명령(Interlock) 송신',
      target: '충돌 사고 제로(Zero) 및 센서 데이터 처리 지연 시간 50ms 이내 유지',
      output: 'AMR 주변 위험 반경 시각화 및 실시간 근접도 모니터'
    }
  },
  { 
    id: 32, 
    category: 'AI 안전 에이전트', 
    name: '긴급 정지 및 알람 제어', 
    description: '비상 상황 시 전 공정 즉각 정지 및 다채널 알림', 
    agent: 'Safety Agent', 
    roles: ['관리자'],
    details: {
      scenario: '중대 재해 발생 또는 감지 시 전체 공정 및 설비를 즉각 정지시키고 비상 대응 체계 가동',
      logic: '긴급 정지 신호(E-Stop) 수신 -> 전 설비 PLC 인터락 작동 -> 전 직원 다채널(Siren, SMS, App) 비상 알림',
      target: '비상 정지 명령 실행 시간 100ms 이내 및 전파 성공률 100% 확보',
      output: '전 공정 비상 정지 상태 대시보드 및 비상 대응 가이드'
    }
  },

  // AI 어시스턴트
  { 
    id: 21, 
    category: 'AI 슈퍼바이저 에이전트', 
    name: 'AI 챗봇 (자연어 질의)', 
    description: '자연어 질의 -> Text-to-SQL / RAG 자동 응답', 
    agent: 'Supervisor', 
    roles: ['전체'],
    details: {
      scenario: '자연어 질의를 통한 실시간 생산 데이터 조회, 도메인 지식 검색 및 의사결정 지원',
      logic: 'LLM 기반 의도 파악 -> Text-to-SQL 엔진(데이터 조회) 또는 RAG 엔진(매뉴얼/지식 검색) 분기 실행 -> 결과 요약 및 시각화 응답',
      target: '자연어 질의 응답 정확도 95% 이상 확보 및 복합 질의 처리 지연 시간 3초 이내 관리',
      output: '대화형 텍스트 응답, 동적 차트 생성 및 관련 문서 링크 제공'
    }
  },
  { 
    id: 22, 
    category: 'AI 슈퍼바이저 에이전트', 
    name: 'AI 추천 액션 목록', 
    description: 'Agent별 추천 조치 리스트 + 근거 표시', 
    agent: 'Supervisor', 
    roles: ['관리자'],
    details: {
      scenario: '다중 에이전트(Multi-Agent) 분석 결과 기반 최적의 공정 개선 및 문제 해결 액션 추천',
      logic: '에이전트별 분석 결과 통합 -> 우선순위 매트릭스(안전>품질>생산) 기반 정렬 -> 추천 조치별 기대 효과 및 근거(Reasoning) 생성',
      target: '추천 액션의 현장 적용률 향상 및 의사결정 지원을 위한 정량적 근거 제시율 100% 확보',
      output: '통합 AI 추천 액션 리스트 및 상세 분석 근거 패널'
    }
  },
  { 
    id: 23, 
    category: 'AI 슈퍼바이저 에이전트', 
    name: 'Agent 실행 이력', 
    description: '6개 Agent의 판단/실행 이력 타임라인 뷰', 
    agent: 'Supervisor', 
    roles: ['관리자'],
    details: {
      scenario: 'AI 에이전트의 판단 과정 및 실행 이력에 대한 투명성(Explainability) 확보 및 사후 감사(Audit)',
      logic: 'Agent Action Log 기반 시계열 타임라인 구성 -> 판단 근거(Reasoning Path) 시각화 -> 실행 결과 피드백 루프 분석',
      target: 'AI 의사결정 이력 100% 기록 및 추적성 확보를 통한 시스템 신뢰도 제고',
      output: '에이전트 실행 이력 타임라인 및 판단 근거 상세 뷰어'
    }
  },
  { 
    id: 24, 
    category: 'AI 슈퍼바이저 에이전트', 
    name: '승인 대기 큐', 
    description: 'Level 2+ 조치 승인/거부 워크플로우', 
    agent: 'Human Gate', 
    roles: ['공장장'],
    details: {
      scenario: '고위험 또는 중요 공정 제어에 대한 인간-AI 협업(HITL) 승인 프로세스 관리',
      logic: '자율 제어 레벨(Level 2+) 트리거 감지 -> 승인 대기 상태 전환 -> 관리자 검토 및 승인/거부 피드백 수집 -> 제어 명령 실행 또는 중단',
      target: '중요 공정 제어의 안전성 확보 및 승인 프로세스 평균 처리 시간 10분 이내 관리',
      output: '승인 대기 목록 관리 인터페이스 및 의사결정 지원 데이터 패널'
    }
  },
  // 시스템 관리
  { 
    id: 26, 
    category: '시스템 관리', 
    name: '온톨로지 관리', 
    description: '규칙/임계치 편집, 새 규칙 추가', 
    roles: ['관리자'],
    details: {
      scenario: '지식 기반 시스템의 핵심인 온톨로지(Ontology) 스키마, 규칙 및 도메인 지식 관리',
      logic: '그래프 데이터베이스 기반 엔티티 관계 편집 -> Heuristic 규칙 엔진 설정 -> 스키마 무결성 및 규칙 충돌 자동 검증',
      target: '공정 지식의 디지털 자산화 및 지식 베이스 업데이트 주기 단축을 통한 시스템 유연성 확보',
      output: '온톨로지 시각화 편집기 및 지식 베이스 관리 인터페이스'
    }
  },
  { 
    id: 27, 
    category: '시스템 관리', 
    name: '모델 레지스트리', 
    description: 'MLflow 모델 버전/성능/배포 상태 관리', 
    roles: ['관리자'],
    details: {
      scenario: '머신러닝 모델의 생애주기 관리(MLOps) 및 운영 환경 배포 모델의 성능 모니터링',
      logic: 'MLflow 기반 모델 버전 관리 -> 성능 메트릭(Accuracy, RMSE 등) 추적 -> 모델 드리프트(Drift) 감지 및 재학습 트리거 관리',
      target: '운영 모델의 성능 저하 방지 및 모델 배포/교체 프로세스의 안정성 확보',
      output: '모델 버전 관리 대시보드 및 성능 비교 분석 리포트'
    }
  },
  { 
    id: 28, 
    category: '시스템 관리', 
    name: '사용자/권한 관리', 
    description: '역할별 메뉴 접근 권한 + 승인 권한 설정', 
    roles: ['관리자'],
    details: {
      scenario: '사용자 역할 기반 접근 제어(RBAC) 및 시스템 기능별 권한 세분화 관리',
      logic: '사용자 프로필 관리 -> 역할별 권한 매트릭스 설정 -> 메뉴 접근 및 중요 조치 승인 권한 제어 엔진 연동',
      target: '시스템 보안성 강화 및 역할에 따른 업무 분장(Segregation of Duties) 명확화',
      output: '사용자 계정 관리 그리드 및 역할별 권한 설정 인터페이스'
    }
  },
  { 
    id: 29, 
    category: '시스템 관리', 
    name: '시스템 모니터링', 
    description: '서비스 헬스, CPU/GPU/메모리, Kafka Lag', 
    roles: ['관리자'],
    details: {
      scenario: '플랫폼 인프라 및 마이크로서비스의 가용성, 성능 및 리소스 사용량 통합 관제',
      logic: 'Prometheus/Grafana 메트릭 수집 -> 서비스별 헬스 체크 -> 인프라 부하 및 메시지 큐(Kafka) 지연 시간 실시간 분석',
      target: '시스템 가동률(Uptime) 99.9% 유지 및 인프라 병목 현상 사전 탐지 및 대응',
      output: '인프라 통합 관제 대시보드 및 서비스 상태 매트릭스'
    }
  },
  { 
    id: 30, 
    category: '시스템 관리', 
    name: '알림 설정', 
    description: '알림 채널, 임계치, 수신자 설정', 
    roles: ['관리자'],
    details: {
      scenario: '이벤트 등급별 알림 전파 정책 수립 및 다채널 알림 수신 환경 최적화',
      logic: '알림 규칙 정의 -> 수신 그룹 및 채널(SMS, Email, App) 매핑 -> 알림 중복 방지 및 에스컬레이션(Escalation) 정책 적용',
      target: '중요 알림의 수신 누락 제로화 및 알림 피로도(Alert Fatigue) 관리를 통한 대응 효율성 제고',
      output: '알림 정책 설정 인터페이스 및 채널별 발송 이력 로그'
    }
  },
  {
    id: 31,
    category: 'AI 슈퍼바이저 에이전트',
    name: '슈퍼바이저 센터',
    description: '통합 판단, 목표 관리 및 플레이북 실행',
    agent: 'Supervisor',
    roles: ['관리자'],
    details: {
      scenario: '상위 목표 기반 태스크 분해 및 에이전트 간 충돌 조정',
      logic: 'Goal-to-Task 분해 엔진 + Conflict Resolver + Evidence Pack 생성',
      target: '안전/품질 우선 정책 기반 최종 의사결정 신뢰도 98% 확보',
      output: '통합 판단 대시보드 및 감사 리포트'
    }
  },
];

export const CATEGORIES = [
  '시스템 개요',
  'AI 품질 에이전트',
  'AI 설비예지보전 에이전트',
  'AI 생산 최적화 에이전트',
  'AI 에너지 에이전트',
  'AI 안전 에이전트',
  'AI 슈퍼바이저 에이전트',
  '시스템 관리',
];

export const MOCK_GOALS: Goal[] = [
  {
    id: 'G1',
    title: '출하 리스크 오늘 0으로',
    status: 'In Progress',
    tasks: [
      { agentId: 'Quality Agent', task: '비전검사 강화 및 공정변동 분석', progress: 65 },
      { agentId: 'Line Monitor Agent', task: '라인 Tact 재산정 및 병목 제거', progress: 40 },
      { agentId: 'Logistics Agent', task: 'AMR 운영정책 조정 및 물류 최적화', progress: 20 },
    ]
  }
];

export const MOCK_PLAYBOOKS: Playbook[] = [
  {
    id: 'P1',
    name: '불량 유출 위험 대응',
    triggerEvent: '불량률 > 8% 감지',
    status: 'Active',
    actions: [
      { agentId: 'Quality Agent', action: '검사 기준 강화', params: { level: 'High' } },
      { agentId: 'Line Monitor Agent', action: '대시보드 경보 발송', params: { target: 'All' } },
      { agentId: 'Supervisor', action: '출하 홀드 요청', params: { reason: 'Quality Risk' } },
    ]
  },
  {
    id: 'P2',
    name: '안전 위험 감지 대응',
    triggerEvent: 'CCTV 위험 감지',
    status: 'Active',
    actions: [
      { agentId: 'Safety Agent', action: '즉시 감속/정지', params: { scope: 'Section A' } },
      { agentId: 'Supervisor', action: '로봇/AMR 안전모드 전환', params: { mode: 'Safe' } },
    ]
  }
];

export const MOCK_COORDINATION_EVENTS: CoordinationEvent[] = [
  {
    id: 'CE1',
    timestamp: new Date(Date.now() - 10000).toISOString(),
    fromAgent: '시전종합검사',
    toAgent: 'Supervisor',
    type: 'info',
    content: '검사 데이터 분석 중... 특이사항 없음.',
    stationId: 'pre-inspection'
  },
  {
    id: 'CE2',
    timestamp: new Date(Date.now() - 8000).toISOString(),
    fromAgent: '공급부',
    toAgent: 'Supervisor',
    type: 'info',
    content: '원자재 공급 원활. 전력망 상태 양호.',
    stationId: 'supply'
  },
  {
    id: 'CE3',
    timestamp: new Date(Date.now() - 6000).toISOString(),
    fromAgent: '도금',
    toAgent: 'Supervisor',
    type: 'critique',
    content: '도금액 농도 미세 저하 감지. 보충 필요.',
    stationId: 'plating'
  },
  {
    id: 'CE4',
    timestamp: new Date(Date.now() - 4000).toISOString(),
    fromAgent: '배출부',
    toAgent: 'Supervisor',
    type: 'info',
    content: '제품 배출 정상 속도 유지 중.',
    stationId: 'discharge'
  },
  {
    id: 'CE5',
    timestamp: new Date(Date.now() - 2000).toISOString(),
    fromAgent: '물류 팔레타이저',
    toAgent: 'Supervisor',
    type: 'agreement',
    content: '팔레트 적재 완료. 다음 배치 대기 중.',
    stationId: 'palletizer'
  },
  {
    id: 'CE6',
    timestamp: new Date(Date.now() - 1000).toISOString(),
    fromAgent: '공정 최적화 봇',
    toAgent: 'Supervisor',
    type: 'proposal',
    content: '도금 공정 효율 개선을 위한 온도 2도 상향 제안.',
    stationId: 'optimization-bot'
  }
];
