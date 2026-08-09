class ApiError(Exception):
    """Carries a user-facing error envelope: kind + message + optional extras."""

    def __init__(self, status: int, kind: str, message: str, **extra):
        super().__init__(message)
        self.status = status
        self.kind = kind
        self.message = message
        self.extra = extra

    def to_dict(self) -> dict:
        return {"kind": self.kind, "message": self.message, **self.extra}


class ConnectionError(ApiError):
    def __init__(self, message: str):
        super().__init__(status=400, kind="connection", message=message)


class IntrospectionTimeout(ApiError):
    def __init__(self, message: str):
        super().__init__(
            status=504,
            kind="timeout",
            message=message,
            suggestFocusMode=True,
        )
