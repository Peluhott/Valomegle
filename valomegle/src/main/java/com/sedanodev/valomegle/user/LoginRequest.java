package com.sedanodev.valomegle.user;

import lombok.Data;

@Data
public class LoginRequest {
    private String username;
    private String password;
}