#!/usr/bin/env python3
import os
from typing import Optional

import typer
from dotenv import load_dotenv

from app.db.database import SessionLocal
# Import all model modules to ensure SQLAlchemy registry is configured
from app.models import case, payment, notification, message, kancelaria  # noqa: F401
from app.models.user import User, UserRole
from app.services.auth_service import AuthService

app = typer.Typer(help="Management CLI for users and operational tasks")

# Load .env automatically so this works in dev/prod without manual exports
load_dotenv()


def _upsert_user(email: str, password: str, role: UserRole, first_name: str = "") -> User:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email, first_name=first_name or role.name.title())
            db.add(user)
        user.role = role
        user.is_active = True
        user.is_verified = True
        user.hashed_password = AuthService.get_password_hash(password)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@app.command("create-admin")
def create_admin(
    email: str = typer.Option(..., help="Admin email"),
    password: str = typer.Option(..., prompt=True, hide_input=True, confirmation_prompt=True),
    first_name: Optional[str] = typer.Option("Admin", help="First name")
):
    """Create or update an admin user with the given credentials."""
    user = _upsert_user(email=email, password=password, role=UserRole.ADMIN, first_name=first_name or "Admin")
    typer.secho(f"Admin upserted: {user.email} (id={user.id})", fg=typer.colors.GREEN)


@app.command("create-operator")
def create_operator(
    email: str = typer.Option(..., help="Operator email"),
    password: str = typer.Option(..., prompt=True, hide_input=True, confirmation_prompt=True),
    first_name: Optional[str] = typer.Option("Operator", help="First name")
):
    """Create or update an operator user with the given credentials."""
    user = _upsert_user(email=email, password=password, role=UserRole.OPERATOR, first_name=first_name or "Operator")
    typer.secho(f"Operator upserted: {user.email} (id={user.id})", fg=typer.colors.GREEN)


@app.command("reset-password")
def reset_password(
    email: str = typer.Option(..., help="User email"),
    new_password: str = typer.Option(..., prompt=True, hide_input=True, confirmation_prompt=True),
):
    """Reset password for an existing user."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise typer.Exit(code=1)
        user.hashed_password = AuthService.get_password_hash(new_password)
        db.commit()
        typer.secho(f"Password updated for {email}", fg=typer.colors.GREEN)
    finally:
        db.close()


if __name__ == "__main__":
    app()
