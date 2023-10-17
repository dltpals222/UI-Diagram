// A, B, C 함수 정의
function A() {
  console.log('함수 A 실행');
}

function B() {
  console.log('함수 B 실행');
}

function C() {
  console.log('함수 C 실행');
}

// 함수들을 담은 배열 생성
var functions = [A, B, C];

// 조건에 따라 함수 호출
var Z = 'C'; // Z 변수에 영어 알파벳 문자열이 들어간다고 가정

for (var i = 0; i < functions.length; i++) {
  if (String.fromCharCode(65 + i) === Z) { // 영어 알파벳 대문자로 변환하여 비교
    var func = functions[i];
    func(); // 해당하는 함수 호출
    break;
  }
}
