from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven configuration for the Analytics Service."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000
    service_name: str = "analytics-service"

    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "defaultdb"
    mysql_ssl: bool = True

    rabbitmq_url: str = ""
    rabbitmq_exchange: str = "pokeshop.events"
    rabbitmq_queue: str = "analytics.events"

    @property
    def sqlalchemy_url(self) -> str:
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        )


settings = Settings()
