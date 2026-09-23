import logging
import logging.config
from typing import Final


LOG_FORMAT: Final[str] = (
    "%(asctime)s | %(levelname)s | "
    "%(name)s | %(message)s"
)


def setup_logging() -> None:
    """
    Configure application-wide logging.

    Called once when the FastAPI application starts.
    """

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,

            "formatters": {
                "default": {
                    "format": LOG_FORMAT,
                }
            },

            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "level": "INFO",
                }
            },

            "root": {
                "handlers": ["console"],
                "level": "INFO",
            },

            "loggers": {
                "uvicorn": {
                    "handlers": ["console"],
                    "level": "INFO",
                    "propagate": False,
                },
                "uvicorn.error": {
                    "handlers": ["console"],
                    "level": "INFO",
                    "propagate": False,
                },
                "uvicorn.access": {
                    "handlers": ["console"],
                    "level": "INFO",
                    "propagate": False,
                },
            },
        }
    )