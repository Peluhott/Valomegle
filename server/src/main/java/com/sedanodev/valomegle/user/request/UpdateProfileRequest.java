package com.sedanodev.valomegle.user.request;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String firstName;
    private String lastName;
    private String rank;
    private String region;
}
