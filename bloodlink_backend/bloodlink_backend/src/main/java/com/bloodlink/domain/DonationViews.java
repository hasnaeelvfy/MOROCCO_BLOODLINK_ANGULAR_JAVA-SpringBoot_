package com.bloodlink.domain;

import com.bloodlink.dto.response.DonationResponse;
import com.bloodlink.entity.Donation;

public final class DonationViews {

    private DonationViews() {
    }

    public static DonationResponse toResponse(Donation item, CityCatalog cityCatalog) {
        return new DonationResponse(
                item.getId(),
                item.getBloodRequest() == null ? null : item.getBloodRequest().getId(),
                item.getBloodRequest() == null ? null : "BL-" + item.getBloodRequest().getId(),
                DateTimes.iso(item.getDonatedOn()),
                item.getBloodType(),
                item.getHospital().getHospitalName(),
                cityCatalog.nameOf(item.getHospital().getCityId()),
                item.getUnits(),
                item.getStatus(),
                DateTimes.iso(item.getAcceptedAt()),
                DateTimes.iso(item.getContactedAt()),
                DateTimes.iso(item.getScheduledAt()),
                DateTimes.iso(item.getCompletedAt()),
                item.getCancellationReason()
        );
    }
}
