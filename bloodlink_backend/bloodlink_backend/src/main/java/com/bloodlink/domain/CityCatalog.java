package com.bloodlink.domain;

import com.bloodlink.common.enums.MatchLayer;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class CityCatalog {

    private static final List<RegionCities> DATA = List.of(
            new RegionCities("Tanger-Tetouan-Al Hoceima", List.of(
                    "Tangier", "Tetouan", "Al Hoceima", "Larache", "Chefchaouen", "Ouezzane",
                    "M'diq", "Fnideq", "Ksar El Kebir", "Asilah", "Martil", "Targuist",
                    "Imzouren", "Bni Bouayach", "Ajdir"
            )),
            new RegionCities("L'Oriental", List.of(
                    "Oujda", "Nador", "Berkane", "Taourirt", "Jerada", "Guercif", "Figuig",
                    "Driouch", "Saidia", "Al Aaroui", "Zaio", "Ahfir", "El Aioun Sidi Mellouk",
                    "Bouarfa", "Beni Ensar", "Selouane"
            )),
            new RegionCities("Fes-Meknes", List.of(
                    "Fes", "Meknes", "Ifrane", "Sefrou", "Taza", "Taounate", "El Hajeb",
                    "Boulemane", "Azrou", "Moulay Yacoub", "Imouzzer Kandar", "Missour",
                    "Outat El Haj", "Tahla", "Ain Taoujdate", "Moulay Idriss Zerhoun"
            )),
            new RegionCities("Rabat-Sale-Kenitra", List.of(
                    "Rabat", "Sale", "Temara", "Kenitra", "Khemisset", "Sidi Kacem",
                    "Sidi Slimane", "Skhirat", "Tiflet", "Souk El Arbaa", "Mechra Bel Ksiri",
                    "Sidi Yahya El Gharb", "Ain El Aouda", "Bouknadel", "Sidi Allal El Bahraoui"
            )),
            new RegionCities("Beni Mellal-Khenifra", List.of(
                    "Beni Mellal", "Khenifra", "Khouribga", "Azilal", "Fquih Ben Salah",
                    "Kasba Tadla", "Oued Zem", "Bejaad", "Demnate", "El Ksiba",
                    "Souk Sebt Ouled Nemma", "Mrirt", "Zaouiat Cheikh"
            )),
            new RegionCities("Casablanca-Settat", List.of(
                    "Casablanca", "Mohammedia", "El Jadida", "Settat", "Berrechid",
                    "Benslimane", "Nouaceur", "Mediouna", "Sidi Bennour", "Azemmour",
                    "Bouskoura", "Dar Bouazza", "Ain Harrouda", "Tit Mellil", "Bouznika",
                    "El Mansouria", "Had Soualem", "Bir Jdid"
            )),
            new RegionCities("Marrakech-Safi", List.of(
                    "Marrakech", "Safi", "Essaouira", "El Kelaa des Sraghna", "Chichaoua",
                    "Youssoufia", "Ben Guerir", "Tahannaout", "Ait Ourir", "Amizmiz",
                    "Sidi Rahal", "El Attaouia", "Tamensourt", "Imintanoute", "Tamanar"
            )),
            new RegionCities("Draa-Tafilalet", List.of(
                    "Errachidia", "Ouarzazate", "Midelt", "Tinghir", "Zagora", "Erfoud",
                    "Rissani", "Tinejdad", "Boumalne Dades", "Skoura", "Goulmima", "Alnif",
                    "M'Hamid El Ghizlane", "Rich"
            )),
            new RegionCities("Souss-Massa", List.of(
                    "Agadir", "Inezgane", "Ait Melloul", "Taroudant", "Tiznit", "Tata",
                    "Biougra", "Ouled Teima", "Ait Baha", "Tafraout", "Dcheira El Jihadia",
                    "Aourir", "Chtouka Ait Baha", "Aoulouz"
            )),
            new RegionCities("Guelmim-Oued Noun", List.of(
                    "Guelmim", "Tan-Tan", "Sidi Ifni", "Assa", "Zag", "Bouizakarne", "El Ouatia"
            )),
            new RegionCities("Laayoune-Sakia El Hamra", List.of(
                    "Laayoune", "Boujdour", "Tarfaya", "Smara", "El Marsa"
            )),
            new RegionCities("Dakhla-Oued Ed-Dahab", List.of(
                    "Dakhla", "Aousserd", "Bir Gandouz"
            ))
    );

    private final List<String> cities;
    private final List<String> regions;

    public CityCatalog() {
        List<String> cityNames = new ArrayList<>();
        List<String> regionNames = new ArrayList<>();
        for (RegionCities row : DATA) {
            for (String city : row.cities()) {
                cityNames.add(city);
                regionNames.add(row.region());
            }
        }
        this.cities = List.copyOf(cityNames);
        this.regions = List.copyOf(regionNames);
    }

    public String nameOf(Long cityId) {
        int index = indexOf(cityId);
        return index < 0 ? "—" : cities.get(index);
    }

    public String regionOf(Long cityId) {
        int index = indexOf(cityId);
        return index < 0 ? "" : regions.get(index);
    }

    public boolean isValid(Long cityId) {
        return indexOf(cityId) >= 0;
    }

    public MatchLayer layer(Long donorCityId, Long hospitalCityId) {
        if (donorCityId != null && donorCityId.equals(hospitalCityId)) {
            return MatchLayer.CITY;
        }
        String donorRegion = regionOf(donorCityId);
        String hospitalRegion = regionOf(hospitalCityId);
        if (!donorRegion.isBlank() && donorRegion.equals(hospitalRegion)) {
            return MatchLayer.REGION;
        }
        return MatchLayer.NATIONAL;
    }

    private int indexOf(Long cityId) {
        if (cityId == null || cityId < 1 || cityId > cities.size()) {
            return -1;
        }
        return cityId.intValue() - 1;
    }

    private record RegionCities(String region, List<String> cities) {
    }
}
