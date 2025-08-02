// DOM 요소 선택
const recordBtn = document.querySelector(".record"),
  result = document.querySelector(".result"),
  exportBtn = document.querySelector("#exportBtn"),
  inputLanguage = document.querySelector("#language"),
  clearBtn = document.querySelector(".clear"),
  infoButton = document.querySelector("#infoButton"),
  copyBtn = document.querySelector("#copyBtn"),
  exportMenu = document.querySelector("#exportMenu"),
  toast = document.querySelector("#toast");

// 편집 관련 요소들
const undoBtn = document.querySelector("#undoBtn"),
  redoBtn = document.querySelector("#redoBtn"),
  boldBtn = document.querySelector("#boldBtn"),
  italicBtn = document.querySelector("#italicBtn");

// 음성 인식 관련 변수들
let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition,
  recognition,
  recording = false;

// 편집 히스토리 관리
let editHistory = [];
let historyIndex = -1;

// 언어 목록 채우기
function populateLanguages() {
  languages.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang.code;
    option.innerHTML = lang.name;
    inputLanguage.appendChild(option);
  });
}

// 토스트 메시지 표시
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// 편집 히스토리 저장
function saveToHistory() {
  const content = result.innerHTML;
  // 현재 위치 이후의 히스토리 제거 (새로운 변경사항이 있을 때)
  editHistory = editHistory.slice(0, historyIndex + 1);
  editHistory.push(content);
  historyIndex++;
  
  // 히스토리 크기 제한 (메모리 관리)
  if (editHistory.length > 50) {
    editHistory.shift();
    historyIndex--;
  }
  
  updateEditButtons();
}

// 편집 버튼 상태 업데이트
function updateEditButtons() {
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = historyIndex >= editHistory.length - 1;
}

// 음성 인식 시작
function speechToText() {
  try {
    // 마이크 권한 요청
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // 권한이 허용된 경우
        recognition = new SpeechRecognition();
        recognition.lang = inputLanguage.value;
        recognition.interimResults = true;
        recognition.continuous = true;
        
        // UI 업데이트
        recordBtn.classList.add("recording");
        recordBtn.querySelector("p").innerHTML = "Listening...";
        
        // 음성 인식 시작
        recognition.start();

        // 음성 인식 결과 처리
        recognition.onresult = (event) => {
          const speechResult = event.results[event.results.length - 1][0].transcript;
          
          // 최종 결과인 경우
          if (event.results[event.results.length - 1].isFinal) {
            saveToHistory(); // 변경사항 저장
            
            // 음성 명령 처리
            const processedText = processVoiceCommands(speechResult);
            result.innerHTML += " " + processedText;
            
            // 임시 결과 제거
            const interimElement = result.querySelector("p.interim");
            if (interimElement) {
              interimElement.remove();
            }
          } else {
            // 임시 결과 표시
            if (!document.querySelector(".interim")) {
              const interim = document.createElement("p");
              interim.classList.add("interim");
              result.appendChild(interim);
            }
            document.querySelector(".interim").innerHTML = " " + speechResult;
          }
          
          exportBtn.disabled = false;
        };

        // 음성 종료 시 재시작
        recognition.onspeechend = () => {
          if (recording) {
            setTimeout(() => {
              if (recording) {
                recognition.start();
              }
            }, 100);
          }
        };

        // 에러 처리
        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          
          switch (event.error) {
            case "no-speech":
              showToast("음성이 감지되지 않았습니다.", 'warning');
              break;
            case "audio-capture":
              showToast("마이크를 찾을 수 없습니다. 연결을 확인해주세요.", 'error');
              stopRecording();
              break;
            case "not-allowed":
              showToast("마이크 권한이 거부되었습니다.", 'error');
              stopRecording();
              break;
            case "aborted":
              showToast("음성 인식이 중단되었습니다.", 'info');
              break;
            case "network":
              showToast("네트워크 오류가 발생했습니다.", 'error');
              break;
            default:
              showToast(`인식 오류: ${event.error}`, 'error');
          }
        };
      })
      .catch((error) => {
        recording = false;
        stopRecording();
        console.error("Microphone access error:", error);
        
        if (error.name === "NotAllowedError") {
          showToast("마이크 권한을 허용해주세요.", 'error');
        } else if (error.name === "NotFoundError") {
          showToast("마이크를 찾을 수 없습니다.", 'error');
        } else {
          showToast("마이크 접근 중 오류가 발생했습니다.", 'error');
        }
      });
  } catch (error) {
    recording = false;
    console.error("Speech recognition not supported:", error);
    showToast("음성 인식이 지원되지 않는 브라우저입니다.", 'error');
  }
}

// 음성 명령 처리 (한국어/영어)
function processVoiceCommands(text) {
  const lowerText = text.toLowerCase();
  
  // 줄바꿈 명령
  if (lowerText.includes("새 줄") || lowerText.includes("줄바꿈") || 
      lowerText.includes("new line") || lowerText.includes("line break")) {
    return text.replace(/(새 줄|줄바꿈|new line|line break)/gi, '<br>');
  }
  
  // 문단 나누기 명령
  if (lowerText.includes("새 문단") || lowerText.includes("문단") || 
      lowerText.includes("new paragraph") || lowerText.includes("paragraph")) {
    return text.replace(/(새 문단|문단|new paragraph|paragraph)/gi, '<br><br>');
  }
  
  return text;
}

// 녹음 중지
function stopRecording() {
  if (recognition) {
    recognition.stop();
  }
  recordBtn.querySelector("p").innerHTML = "Start Listening";
  recordBtn.classList.remove("recording");
  recording = false;
}

// 다양한 형식으로 내보내기
function exportAs(format) {
  const text = result.innerText.trim();
  if (!text) {
    showToast("내보낼 텍스트가 없습니다.", 'warning');
    return;
  }
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `voxscript-${timestamp}`;
  
  switch(format) {
    case 'txt':
      downloadFile(text, `${filename}.txt`, 'text/plain');
      break;
      
    case 'pdf':
      exportAsPDF(text, `${filename}.pdf`);
      break;
      
    case 'docx':
      exportAsDocx(text, `${filename}.docx`);
      break;
      
    case 'json':
      const jsonData = {
        timestamp: new Date().toISOString(),
        language: inputLanguage.options[inputLanguage.selectedIndex].text,
        languageCode: inputLanguage.value,
        content: text,
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: text.length,
        metadata: {
          version: "2.0",
          exported: new Date().toISOString()
        }
      };
      downloadFile(JSON.stringify(jsonData, null, 2), `${filename}.json`, 'application/json');
      break;
  }
  
  showToast(`${format.toUpperCase()} 파일로 내보내기 완료!`);
}

// 파일 다운로드 헬퍼 함수
function downloadFile(content, filename, mimeType) {
  const element = document.createElement("a");
  const file = new Blob([content], { type: mimeType });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}

// PDF 내보내기 (간단한 구현)
function exportAsPDF(text, filename) {
  // 실제 환경에서는 jsPDF 라이브러리 사용 권장
  const lines = text.split('\n');
  let pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length ${text.length + 100}
>>
stream
BT
/F1 12 Tf
50 750 Td
`;

  lines.forEach(line => {
    pdfContent += `(${line.replace(/[()\\]/g, '\\$&')}) Tj T* `;
  });

  pdfContent += `
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000351 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${500 + text.length}
%%EOF`;
  
  downloadFile(pdfContent, filename, 'application/pdf');
}

// DOCX 내보내기 (간단한 구현)
function exportAsDocx(text, filename) {
  // 실제 환경에서는 docx 라이브러리 사용 권장
  const docxContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:spacing w:after="200"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
        </w:rPr>
        <w:t>Voxscript 음성 인식 결과</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:sz w:val="20"/>
          <w:szCs w:val="20"/>
        </w:rPr>
        <w:t>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
  
  downloadFile(docxContent, filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}

// 이벤트 리스너 등록

// 녹음 버튼
recordBtn.addEventListener("click", () => {
  if (!recording) {
    speechToText();
    recording = true;
  } else {
    stopRecording();
  }
});

// 클리어 버튼
clearBtn.addEventListener("click", () => {
  if (result.innerHTML.trim()) {
    saveToHistory();
  }
  result.innerHTML = "";
  exportBtn.disabled = true;
  showToast("내용이 지워졌습니다!");
});

// 복사 버튼
copyBtn.addEventListener("click", async () => {
  const text = result.innerText.trim();
  if (!text) {
    showToast("복사할 텍스트가 없습니다.", 'warning');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(text);
    showToast("클립보드에 복사되었습니다!");
  } catch (err) {
    // 폴백 방법
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast("클립보드에 복사되었습니다!");
    } catch (e) {
      showToast("복사에 실패했습니다.", 'error');
    }
    document.body.removeChild(textArea);
  }
});

// 내보내기 드롭다운
exportBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle("show");
});

// 다른 곳 클릭 시 드롭다운 닫기
document.addEventListener("click", (e) => {
  if (!e.target.closest('.export-dropdown')) {
    exportMenu.classList.remove("show");
  }
});

// 내보내기 옵션 선택
document.querySelectorAll('.export-option').forEach(option => {
  option.addEventListener('click', (e) => {
    const format = e.currentTarget.dataset.format;
    exportAs(format);
    exportMenu.classList.remove("show");
  });
});

// 편집 기능들
undoBtn.addEventListener("click", () => {
  if (historyIndex > 0) {
    historyIndex--;
    result.innerHTML = editHistory[historyIndex];
    updateEditButtons();
    showToast("실행취소!");
  }
});

redoBtn.addEventListener("click", () => {
  if (historyIndex < editHistory.length - 1) {
    historyIndex++;
    result.innerHTML = editHistory[historyIndex];
    updateEditButtons();
    showToast("다시실행!");
  }
});

boldBtn.addEventListener("click", () => {
  document.execCommand('bold');
  saveToHistory();
  showToast("굵게 적용!");
});

italicBtn.addEventListener("click", () => {
  document.execCommand('italic');
  saveToHistory();
  showToast("기울임 적용!");
});

// 텍스트 영역 변경 감지
result.addEventListener("input", () => {
  exportBtn.disabled = result.innerText.trim() === '';
});

// 포커스 시 초기 히스토리 저장
result.addEventListener("focus", () => {
  if (editHistory.length === 0) {
    saveToHistory();
  }
});

// 키보드 단축키
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch(e.key) {
      case 's':
        e.preventDefault();
        if (!exportBtn.disabled) exportAs('txt');
        break;
      case 'z':
        if (!e.shiftKey && historyIndex > 0) {
          e.preventDefault();
          undoBtn.click();
        } else if (e.shiftKey && historyIndex < editHistory.length - 1) {
          e.preventDefault();
          redoBtn.click();
        }
        break;
      case 'c':
        if (window.getSelection().toString() === '' && result.innerText.trim()) {
          e.preventDefault();
          copyBtn.click();
        }
        break;
      case 'r':
        e.preventDefault();
        if (!recording) {
          recordBtn.click();
        }
        break;
    }
  }
  
  // ESC 키로 녹음 중지
  if (e.key === 'Escape' && recording) {
    stopRecording();
    showToast("녹음이 중지되었습니다.");
  }
});

// 정보 버튼
if (infoButton) {
  infoButton.addEventListener("click", () => {
    const shortcuts = `Enhanced Voxscript v2.0

새로운 기능:
✓ 편집 가능한 텍스트 결과
✓ 다양한 내보내기 형식 (TXT, PDF, DOCX, JSON)
✓ 실행취소/다시실행 기능
✓ 클립보드 복사
✓ 음성 명령 지원
✓ 키보드 단축키

키보드 단축키:
• Ctrl+S: TXT로 빠른 저장
• Ctrl+Z: 실행취소
• Ctrl+Shift+Z: 다시실행  
• Ctrl+C: 전체 텍스트 복사
• Ctrl+R: 녹음 시작/중지
• ESC: 녹음 중지

음성 명령:
• "새 줄" 또는 "줄바꿈": 줄 바꿈
• "새 문단" 또는 "문단": 문단 나눔

개발자: Enhanced by AI Assistant
GitHub: https://github.com/Rootpye`;
    
    alert(shortcuts);
  });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  populateLanguages();
  updateEditButtons();
  
  // 기본 언어를 한국어로 설정 (선택사항)
  const defaultLang = 'ko';
  if (inputLanguage.querySelector(`option[value="${defaultLang}"]`)) {
    inputLanguage.value = defaultLang;
  }
  
  showToast("Voxscript이 준비되었습니다!", 'info');
});
