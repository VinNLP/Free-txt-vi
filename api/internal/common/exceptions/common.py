from fastapi import HTTPException


class XBaseException(HTTPException):

    def __init__(self, status_code: str, message: int):
        self.message = message
        self.status_code = status_code
        super().__init__(status_code=status_code, detail=message)


class ExceptionObjectDeleted(XBaseException):
    def __init__(self, object_name: str = "Object"):
        super().__init__(status_code=410,
                         message=f"{object_name} has been deleted")


class ExceptionInternalError(XBaseException):
    def __init__(self, message: str = "Internal server error"):
        super().__init__(status_code=500, message=message)


class ExceptionUnauthorized(XBaseException):
    def __init__(self):
        super().__init__(status_code=401, message="Unauthorized")


class ExceptionForbidden(XBaseException):
    def __init__(self):
        super().__init__(status_code=403, message="Forbidden")


class ExceptionLimitExceeded(XBaseException):
    def __init__(self):
        super().__init__(
            status_code=403,
            message="Exceeded the maximum number of allowed requests",
        )
