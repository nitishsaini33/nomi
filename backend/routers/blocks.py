from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from core.database import get_db
from models.user import User
from models.block import Block
from schemas.user import UserResponse
from services.auth_service import get_current_user

router = APIRouter(prefix="/blocks", tags=["blocks"])

@router.post("/{blocked_id}")
async def block_user(
    blocked_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if blocked_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
        
    result = await db.execute(
        select(Block).where((Block.blocker_id == current_user.id) & (Block.blocked_id == blocked_id))
    )
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="User already blocked")
        
    new_block = Block(blocker_id=current_user.id, blocked_id=blocked_id)
    db.add(new_block)
    await db.commit()
    return {"message": "User blocked successfully"}

@router.delete("/{blocked_id}")
async def unblock_user(
    blocked_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Block).where((Block.blocker_id == current_user.id) & (Block.blocked_id == blocked_id))
    )
    block = result.scalars().first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
        
    await db.delete(block)
    await db.commit()
    return {"message": "User unblocked successfully"}
