let localizacaoAtual = "Localização não permitida";

window.onload = function () {
  // Solicita localização ao carregar a página
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude.toFixed(5);
        const lon = position.coords.longitude.toFixed(5);
        localizacaoAtual = `Latitude: ${lat}, Longitude: ${lon}`;
      },
      function (error) {
        console.warn("Erro ao obter localização:", error.message);
      }
    );
  } else {
    alert("Geolocalização não suportada pelo seu navegador.");
  }
};

function registrarPonto() {
  const nomeFuncionario = "João da Silva"; // Pode ser dinâmico com backend
  const horario = new Date().toLocaleTimeString("pt-BR");

  const mensagem = `
    ✅ Ponto registrado com sucesso!<br>
    👤 Funcionário: <strong>${nomeFuncionario}</strong><br>
    🕒 Horário: <strong>${horario}</strong><br>
    📍 Localização: <strong>${localizacaoAtual}</strong>
  `;

  document.getElementById("mensagem").innerHTML = mensagem;
}
