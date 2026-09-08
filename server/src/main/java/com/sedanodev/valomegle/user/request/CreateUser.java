package com.sedanodev.valomegle.user.request;

import lombok.Data;

@Data

public class CreateUser {
    private String username;
    private String email;
    private String password;

}
