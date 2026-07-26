package com.sedanodev.valomegle.user;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfileResponse {
    private String username;
    private String firstName;
    private String lastName;
    private String rank;
    private String region;
}
