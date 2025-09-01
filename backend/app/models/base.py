from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any
from datetime import datetime, timezone
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler: Any) -> Any:
        from pydantic_core import core_schema
        return core_schema.field_plain_validator_function(
            cls._validate,
            field_name="_id"
        )
    
    @classmethod
    def _validate(cls, v: Any, info: Any) -> "PyObjectId":
        if isinstance(v, str):
            if not ObjectId.is_valid(v):
                raise ValueError("Invalid ObjectId string")
            return cls(v)
        elif isinstance(v, ObjectId):
            return cls(v)
        else:
            raise ValueError("Invalid ObjectId format")

class BaseDBModel(BaseModel):
    model_config = ConfigDict(
        validate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, PyObjectId: str},
        populate_by_name=True
    )
    
    id: Optional[str] = Field(default=None, alias="_id")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __init__(self, **data):
        # Convert ObjectId to string for the id field
        if "_id" in data and isinstance(data["_id"], ObjectId):
            data["_id"] = str(data["_id"])
        super().__init__(**data)
