import json
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Dict, List, Optional


DEFAULT_OLLAMA_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3.2:1b"


class OllamaError(RuntimeError):
    pass


@dataclass
class OllamaClient:
    base_url: str = DEFAULT_OLLAMA_URL
    model: str = DEFAULT_MODEL
    timeout: int = 30

    def list_models(self) -> List[str]:
        raw = self._request("GET", "/api/tags")
        return [model["name"] for model in raw.get("models", [])]

    def ensure_model_available(self) -> None:
        models = self.list_models()
        if self.model not in models:
            available = ", ".join(models) or "ninguno"
            raise OllamaError(
                f"El modelo '{self.model}' no está instalado en Ollama. "
                f"Modelos disponibles: {available}. Instálalo con: ollama pull {self.model}"
            )

    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.35) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature},
        }
        raw = self._request("POST", "/api/chat", payload)
        content = raw.get("message", {}).get("content", "")
        return re.sub(r"<think>[\s\S]*?</think>", "", content).strip()

    def chat_json(self, messages: List[Dict[str, str]], temperature: float = 0.2) -> dict:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {"temperature": temperature},
        }
        raw = self._request("POST", "/api/chat", payload)
        content = raw.get("message", {}).get("content", "").strip()
        content = re.sub(r"^```(?:json)?\s*", "", content, flags=re.IGNORECASE)
        content = re.sub(r"\s*```$", "", content)
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise OllamaError(f"Ollama no devolvió JSON válido: {content[:500]}") from exc

    def _request(self, method: str, path: str, payload: Optional[dict] = None) -> dict:
        url = self.base_url.rstrip("/") + path
        data = None
        headers = {"Content-Type": "application/json"}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")

        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = response.read().decode("utf-8")
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise OllamaError(f"No pude conectar con Ollama en {self.base_url}: {exc}") from exc

        try:
            return json.loads(body)
        except json.JSONDecodeError as exc:
            raise OllamaError(f"Ollama devolvió una respuesta no JSON: {body[:300]}") from exc
