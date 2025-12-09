class UserPublicDisplay(BaseModel):
    id: int
    username: str
    about_me: Optional[str] = None
    image_url: Optional[str] = None
    intent: Optional[str] = None
    answers: Optional[Union[List[int], str]] = None # Handle varying formats if persisted as string

    class Config:
        from_attributes = True
